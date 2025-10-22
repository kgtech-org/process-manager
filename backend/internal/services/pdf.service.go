package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"html/template"
	"strings"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"github.com/kodesonik/process-manager/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PDFService struct {
	minioService *MinIOService
}

func NewPDFService(minioService *MinIOService) *PDFService {
	return &PDFService{
		minioService: minioService,
	}
}

// GenerateDocumentPDF generates a PDF for a document and uploads it to MinIO
func (s *PDFService) GenerateDocumentPDF(ctx context.Context, document *models.Document) (string, error) {
	fmt.Printf("📄 [PDF] Generating PDF for document: %s (%s)\n", document.Title, document.Reference)

	// Generate HTML from template
	html, err := s.renderDocumentHTML(document)
	if err != nil {
		return "", fmt.Errorf("failed to render HTML: %w", err)
	}
	fmt.Printf("📄 [PDF] Generated HTML length: %d bytes\n", len(html))

	// Convert HTML to PDF using chromedp
	pdfBytes, err := s.htmlToPDF(ctx, html)
	if err != nil {
		return "", fmt.Errorf("failed to convert HTML to PDF: %w", err)
	}
	fmt.Printf("📄 [PDF] Generated PDF size: %d bytes\n", len(pdfBytes))

	// Upload PDF to MinIO
	fileName := fmt.Sprintf("%s_%s_v%s.pdf", document.Reference, time.Now().Format("20060102_150405"), document.Version)
	objectPath := fmt.Sprintf("documents/%s/pdf/%s", document.ID.Hex(), fileName)

	pdfURL, err := s.minioService.UploadFile(ctx, objectPath, bytes.NewReader(pdfBytes), int64(len(pdfBytes)), "application/pdf")
	if err != nil {
		return "", fmt.Errorf("failed to upload PDF: %w", err)
	}

	fmt.Printf("✅ [PDF] PDF generated and uploaded: %s\n", pdfURL)
	return pdfURL, nil
}

// htmlToPDF converts HTML to PDF using headless Chrome
func (s *PDFService) htmlToPDF(ctx context.Context, html string) ([]byte, error) {
	// Replace external URLs with internal Docker network URLs for image access
	// http://localhost/files -> http://minio:9000/process-documents
	html = strings.ReplaceAll(html, "http://localhost/files/process-documents", "http://minio:9000/process-documents")

	fmt.Printf("📄 [PDF] Replaced external URLs with internal MinIO URLs\n")

	// Create allocator options for headless Chrome
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.DisableGPU,
		chromedp.NoDefaultBrowserCheck,
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("no-sandbox", true),
	)

	// Create context with allocator
	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	// Create browser context
	browserCtx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	// Set a timeout for PDF generation
	browserCtx, cancel = context.WithTimeout(browserCtx, 30*time.Second)
	defer cancel()

	var pdfBuf []byte

	// Use base64 encoding for data URL to preserve CSS and avoid encoding issues
	encodedHTML := base64.StdEncoding.EncodeToString([]byte(html))
	dataURL := "data:text/html;charset=utf-8;base64," + encodedHTML

	fmt.Printf("📄 [PDF] Data URL length: %d bytes\n", len(dataURL))

	// Navigate to the data URL and wait for rendering, then print to PDF
	if err := chromedp.Run(browserCtx,
		chromedp.Navigate(dataURL),
		chromedp.WaitReady("body"),
		chromedp.Sleep(2*time.Second), // Give time for CSS, images, and SVG rendering
		chromedp.ActionFunc(func(ctx context.Context) error {
			var err error
			pdfBuf, _, err = page.PrintToPDF().
				WithPrintBackground(true).
				WithDisplayHeaderFooter(false).
				WithPreferCSSPageSize(true). // Use CSS @page rules
				Do(ctx)
			return err
		}),
	); err != nil {
		return nil, err
	}

	return pdfBuf, nil
}

// RenderDocumentHTML renders the document as HTML using template (public method)
// This is used both for PDF generation and direct HTML view
func (s *PDFService) RenderDocumentHTML(ctx context.Context, document *models.Document) (string, error) {
	return s.renderDocumentHTML(document)
}

// getFloat64 safely extracts a float64 value from a map, handling different numeric types
func getFloat64(m map[string]interface{}, key string) float64 {
	if val, ok := m[key]; ok {
		switch v := val.(type) {
		case float64:
			return v
		case float32:
			return float64(v)
		case int:
			return float64(v)
		case int32:
			return float64(v)
		case int64:
			return float64(v)
		}
	}
	return 0
}

// renderShapesToSVG converts diagram shapes to SVG markup
func renderShapesToSVG(shapes interface{}) string {
	fmt.Printf("🎨 [SVG] Rendering shapes, type: %T\n", shapes)

	var shapesList []interface{}

	// Handle different types
	switch v := shapes.(type) {
	case []interface{}:
		shapesList = v
	case primitive.A:
		// MongoDB BSON array type
		shapesList = []interface{}(v)
	default:
		fmt.Printf("❌ [SVG] Unsupported type: %T\n", shapes)
		return fmt.Sprintf(`<div style="border: 2px dashed #ddd; padding: 20px; text-align: center; color: #666;">
			<p>Type error: %T</p>
		</div>`, shapes)
	}

	if len(shapesList) == 0 {
		return `<div style="border: 2px dashed #ddd; padding: 20px; text-align: center; color: #666;">
			<p>No shapes in diagram</p>
		</div>`
	}

	fmt.Printf("✅ [SVG] Found %d shapes to render\n", len(shapesList))

	// Calculate bounding box
	var minX, minY, maxX, maxY float64
	minX, minY = 1000000, 1000000
	maxX, maxY = 0, 0

	for _, shape := range shapesList {
		var shapeMap map[string]interface{}

		// Handle different map types
		switch v := shape.(type) {
		case map[string]interface{}:
			shapeMap = v
		case primitive.M:
			shapeMap = map[string]interface{}(v)
		case primitive.D:
			shapeMap = v.Map()
		default:
			continue
		}

		x := getFloat64(shapeMap, "x")
		y := getFloat64(shapeMap, "y")
		width := getFloat64(shapeMap, "width")
		height := getFloat64(shapeMap, "height")

		if x < minX {
			minX = x
		}
		if y < minY {
			minY = y
		}
		if x+width > maxX {
			maxX = x + width
		}
		if y+height > maxY {
			maxY = y + height
		}

		// Check for arrows
		endX := getFloat64(shapeMap, "endX")
		endY := getFloat64(shapeMap, "endY")
		if endX > 0 {
			if endX > maxX {
				maxX = endX
			}
			if endX < minX {
				minX = endX
			}
		}
		if endY > 0 {
			if endY > maxY {
				maxY = endY
			}
			if endY < minY {
				minY = endY
			}
		}
	}

	// Add padding
	padding := 20.0
	viewBoxX := minX - padding
	viewBoxY := minY - padding
	viewBoxWidth := maxX - minX + 2*padding
	viewBoxHeight := maxY - minY + 2*padding

	svg := fmt.Sprintf(`<svg viewBox="%.1f %.1f %.1f %.1f" style="max-width: 100%%; height: auto; border: 1px solid #ddd; background: white;" xmlns="http://www.w3.org/2000/svg">`,
		viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight)

	// Render each shape
	for _, shape := range shapesList {
		var shapeMap map[string]interface{}

		// Handle different map types
		switch v := shape.(type) {
		case map[string]interface{}:
			shapeMap = v
		case primitive.M:
			shapeMap = map[string]interface{}(v)
		case primitive.D:
			shapeMap = v.Map()
		default:
			fmt.Printf("⚠️  [SVG] Unknown shape type: %T\n", shape)
			continue
		}

		shapeType, _ := shapeMap["type"].(string)
		color, _ := shapeMap["color"].(string)

		// Handle numeric values that might be different types
		x := getFloat64(shapeMap, "x")
		y := getFloat64(shapeMap, "y")
		width := getFloat64(shapeMap, "width")
		height := getFloat64(shapeMap, "height")

		switch shapeType {
		case "rectangle":
			svg += fmt.Sprintf(`<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s" stroke="#000" stroke-width="2"/>`,
				x, y, width, height, color)

		case "circle":
			radius := width / 2
			svg += fmt.Sprintf(`<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="#000" stroke-width="2"/>`,
				x+radius, y+radius, radius, color)

		case "hexagon":
			// Simple hexagon approximation
			cx := x + width/2
			cy := y + height/2
			w := width / 2
			h := height / 2
			svg += fmt.Sprintf(`<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s" stroke="#000" stroke-width="2"/>`,
				cx, cy-h, cx+w, cy-h/2, cx+w, cy+h/2, cx, cy+h, cx-w, cy+h/2, cx-w, cy-h/2, color)

		case "arrow":
			endX := getFloat64(shapeMap, "endX")
			endY := getFloat64(shapeMap, "endY")
			svg += fmt.Sprintf(`<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="2" marker-end="url(#arrowhead)"/>`,
				x, y, endX, endY, color)
		}
	}

	// Add arrowhead marker definition
	svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="` + fmt.Sprintf("%.1f %.1f %.1f %.1f", viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight) + `" style="max-width: 100%; height: auto; border: 1px solid #ddd; background: white;">
		<defs>
			<marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
				<polygon points="0 0, 10 3, 0 6" fill="#000"/>
			</marker>
		</defs>` + svg[strings.Index(svg, ">")+1:]

	svg += "</svg>"
	return svg
}

// renderDocumentHTML renders the document as HTML using template (private helper)
func (s *PDFService) renderDocumentHTML(document *models.Document) (string, error) {
	tmpl, err := template.New("document").Funcs(template.FuncMap{
		"formatDate": func(t time.Time) string {
			if t.IsZero() {
				return ""
			}
			return t.Format("02/01/2006")
		},
		"formatDateTime": func(t time.Time) string {
			if t.IsZero() {
				return ""
			}
			return t.Format("02/01/2006 15:04")
		},
		"formatPtrDate": func(t *time.Time) string {
			if t == nil || t.IsZero() {
				return ""
			}
			return t.Format("02/01/2006")
		},
		"getContributorStatus": func(status models.SignatureStatus) string {
			switch status {
			case models.SignatureStatusPending:
				return "En attente"
			case models.SignatureStatusSigned:
				return "Signé"
			case models.SignatureStatusJoined:
				return "Rejoint"
			default:
				return string(status)
			}
		},
		"renderDiagramSVG": func(shapes interface{}) template.HTML {
			return template.HTML(renderShapesToSVG(shapes))
		},
	}).Parse(documentHTMLTemplate)

	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, document); err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return buf.String(), nil
}

// documentHTMLTemplate is the HTML template for the PDF
const documentHTMLTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{.Title}}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 25mm 15mm 20mm 15mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
            width: 210mm;
            margin: 0 auto;
            padding-bottom: 25mm;
        }

        /* Header styling */
        .page-header {
            margin-bottom: 15px;
        }

        .logo-section {
            text-align: left;
        }

        .company-name {
            font-size: 11pt;
            font-weight: bold;
            color: #FF9500;
            margin-bottom: 2px;
        }

        .company-tagline {
            font-size: 8pt;
            color: #000;
            line-height: 1.2;
        }

        @media print {
            .page-header {
                position: fixed !important;
                top: 0 !important;
                left: -15mm !important;
                right: -15mm !important;
                width: calc(100% + 30mm) !important;
                height: auto !important;
                min-height: 15mm !important;
                background-color: #fff !important;
                border-bottom: 1px solid #ddd !important;
                padding: 6px 15mm !important;
                margin: 0 !important;
                z-index: 1000 !important;
            }
        }

        /* Footer styling - Display at bottom of each page */
        .page-footer {
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 210mm;
            height: 20mm;
            font-size: 8pt;
            color: #000;
            border-top: 2px solid #FF9500;
            padding-top: 8px;
            background-color: #fff;
            z-index: 1000;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
                padding-top: 25mm;
                padding-bottom: 20mm;
            }

            .page-footer {
                position: fixed !important;
                bottom: 0 !important;
                left: -15mm !important;
                right: -15mm !important;
                width: calc(100% + 30mm) !important;
                height: 18mm !important;
                border-top: 2px solid #FF9500 !important;
                background-color: #fff !important;
                padding-top: 6px !important;
                display: block !important;
                margin: 0 !important;
                transform: none !important;
            }

            .footer-content {
                display: flex !important;
                justify-content: space-between !important;
                align-items: flex-start !important;
                padding: 0 15mm !important;
                max-width: 100% !important;
                width: 100% !important;
            }
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 0 15mm;
            width: 100%;
        }

        .footer-left {
            text-align: left;
            flex: 1;
            font-size: 7pt;
            line-height: 1.3;
        }

        .footer-center {
            text-align: center;
            flex: 0 0 60px;
            font-weight: bold;
            font-size: 9pt;
        }

        .page-number::before {
            content: "Page ";
        }

        @media print {
            .page-number {
                display: inline;
            }
            .page-number::after {
                content: " " counter(page, decimal);
            }
        }

        @media screen {
            .page-number {
                display: inline;
            }
        }

        .footer-right {
            text-align: right;
            flex: 1;
            font-size: 7pt;
            line-height: 1.3;
        }

        .footer-tagline {
            font-style: italic;
            color: #FF9500;
            font-weight: bold;
            margin-top: 3px;
        }

        /* Annex content styling */
        .annex-content {
            margin: 10px 0;
        }

        .annex-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 10px 0;
        }

        .annex-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }

        .annex-table th,
        .annex-table td {
            border: 1px solid #000;
            padding: 6px 8px;
        }

        .annex-table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }

        .rich-text-content {
            line-height: 1.6;
        }

        .rich-text-content p {
            margin: 8px 0;
        }

        .rich-text-content ul,
        .rich-text-content ol {
            margin: 8px 0;
            padding-left: 25px;
        }

        .rich-text-content h1,
        .rich-text-content h2,
        .rich-text-content h3 {
            margin: 12px 0 8px 0;
            font-weight: bold;
        }

        .rich-text-content h1 { font-size: 14pt; }
        .rich-text-content h2 { font-size: 12pt; }
        .rich-text-content h3 { font-size: 11pt; }

        .file-list {
            list-style: none;
            padding: 0;
            margin: 10px 0;
        }

        .file-list li {
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
        }

        .file-icon {
            display: inline-block;
            width: 16px;
            height: 16px;
            margin-right: 8px;
        }

        /* Table styling - based on example PDF */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            page-break-inside: auto;
        }

        table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
            font-size: 9pt;
        }

        th {
            background-color: white;
            font-weight: bold;
        }

        /* Title table on first page */
        .title-table {
            margin: 20px 0;
        }

        .title-table th {
            background-color: white;
            font-weight: bold;
            width: 30%;
        }

        .title-table td {
            font-weight: normal;
        }

        /* Signature tables */
        .signature-table {
            margin: 15px 0;
        }

        .signature-table th {
            background-color: white;
            font-weight: bold;
            text-align: center;
        }

        .signature-table td {
            min-height: 40px;
            height: 40px;
        }

        /* Section headers as table rows */
        .section-header-row {
            background-color: white;
        }

        .section-header-row td {
            font-weight: bold;
            font-size: 10pt;
            padding: 8px;
            background-color: white;
            border: 1px solid #000;
        }

        /* Content tables for metadata sections */
        .content-table {
            margin: 10px 0;
        }

        .content-table td {
            padding: 8px;
        }

        .content-table ul {
            margin: 0;
            padding-left: 20px;
        }

        .content-table li {
            margin: 3px 0;
            line-height: 1.4;
        }

        /* Terminology table */
        .glossary-table td {
            padding: 6px 8px;
        }

        .glossary-table td:first-child {
            font-weight: bold;
            width: 25%;
        }

        /* Process steps table */
        .process-table {
            margin: 15px 0;
        }

        .process-table th {
            background-color: white;
            font-weight: bold;
            text-align: center;
            font-size: 9pt;
        }

        .process-table .section-header {
            background-color: white;
            font-weight: bold;
            text-align: center;
            font-size: 10pt;
        }

        .process-table .step-number {
            font-weight: bold;
        }

        .process-table ul {
            margin: 5px 0;
            padding-left: 15px;
        }

        .process-table li {
            margin: 2px 0;
        }

        /* Page breaks */
        .page-break {
            page-break-before: always;
        }

        /* Section title pages */
        .section-title-page {
            page-break-before: always;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 250mm;
            text-align: center;
        }

        .section-title-text {
            font-size: 32pt;
            font-weight: bold;
            color: #FF9500;
            text-transform: uppercase;
            letter-spacing: 3px;
            padding: 40px;
            border: 4px solid #FF9500;
            background-color: #fff;
        }

        /* Print-specific styles */
        @media print {
            .page-break {
                page-break-before: always;
            }
            .section-title-page {
                page-break-before: always;
                page-break-after: always;
            }
            table {
                page-break-inside: auto;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            thead {
                display: table-header-group;
            }
            tfoot {
                display: table-footer-group;
            }
        }
    </style>
</head>
<body>
    <!-- Header on first page -->
    <div class="page-header">
        <div class="logo-section">
            <div class="company-name">TOGOCOM</div>
            <div class="company-tagline">TOGOCEL | TOGO TELECOM</div>
            <div class="company-tagline">Filiales du Groupe Togocom</div>
        </div>
    </div>

    <!-- Title Table -->
    <table class="title-table">
        <tr>
            <th>Référence:</th>
            <td>{{.Reference}} v{{.Version}}</td>
        </tr>
        <tr>
            <th>Titre de document</th>
            <td><strong>{{.Title}}</strong></td>
        </tr>
    </table>

    <!-- Contributors Signature Tables -->
    <table class="signature-table">
        <tr class="section-header-row">
            <td colspan="4">Document Préparé par</td>
        </tr>
        <tr>
            <th>Nom</th>
            <th>Titre</th>
            <th>Signature</th>
            <th>Date</th>
        </tr>
        {{range .Contributors.Authors}}
        <tr>
            <td>{{.Name}}</td>
            <td>{{.Title}}</td>
            <td class="signature-cell"></td>
            <td>{{formatPtrDate .SignatureDate}}</td>
        </tr>
        {{end}}
    </table>

    {{if .Contributors.Verifiers}}
    <table class="signature-table">
        <tr class="section-header-row">
            <td colspan="4">Equipe de Vérification</td>
        </tr>
        <tr>
            <th>Nom</th>
            <th>Titre</th>
            <th>Signature</th>
            <th>Date</th>
        </tr>
        {{range .Contributors.Verifiers}}
        <tr>
            <td>{{.Name}}</td>
            <td>{{.Title}}</td>
            <td class="signature-cell"></td>
            <td>{{formatPtrDate .SignatureDate}}</td>
        </tr>
        {{end}}
    </table>
    {{end}}

    {{if .Contributors.Validators}}
    <table class="signature-table">
        <tr class="section-header-row">
            <td colspan="4">Equipe de Validation</td>
        </tr>
        <tr>
            <th>Nom</th>
            <th>Titre</th>
            <th>Signature</th>
            <th>Date</th>
        </tr>
        {{range .Contributors.Validators}}
        <tr>
            <td>{{.Name}}</td>
            <td>{{.Title}}</td>
            <td class="signature-cell"></td>
            <td>{{formatPtrDate .SignatureDate}}</td>
        </tr>
        {{end}}
    </table>
    {{end}}

    <!-- Métadonnées Section Title Page -->
    <div class="section-title-page">
        <div class="section-title-text">MÉTADONNÉES</div>
    </div>

    <!-- Objectives Section -->
    {{if .Metadata.Objectives}}
    <table class="content-table">
        <tr class="section-header-row">
            <td>OBJECTIFS DE LA PROCEDURE</td>
        </tr>
        <tr>
            <td>
                <ul>
                    {{range .Metadata.Objectives}}
                    <li>{{.}}</li>
                    {{end}}
                </ul>
            </td>
        </tr>
    </table>
    {{end}}

    <!-- Implicated Actors Section -->
    {{if .Metadata.ImplicatedActors}}
    <table class="content-table">
        <tr class="section-header-row">
            <td>PRINCIPAUX INTERVENANTS</td>
        </tr>
        <tr>
            <td>
                <ul>
                    {{range .Metadata.ImplicatedActors}}
                    <li>{{.}}</li>
                    {{end}}
                </ul>
            </td>
        </tr>
    </table>
    {{end}}

    <!-- Management Rules Section -->
    {{if .Metadata.ManagementRules}}
    <table class="content-table">
        <tr class="section-header-row">
            <td>REGLES DE GESTION</td>
        </tr>
        <tr>
            <td>
                <ul>
                    {{range .Metadata.ManagementRules}}
                    <li>{{.}}</li>
                    {{end}}
                </ul>
            </td>
        </tr>
    </table>
    {{end}}

    <!-- Terminology Section -->
    {{if .Metadata.Terminology}}
    <table class="glossary-table">
        <tr class="section-header-row">
            <td colspan="2">DEFINITION DES TERMES - SIGLES – ABREVIATIONS</td>
        </tr>
        {{range .Metadata.Terminology}}
        <tr>
            <td colspan="2">{{.}}</td>
        </tr>
        {{end}}
    </table>
    {{end}}

    <!-- Change History -->
    {{if .Metadata.ChangeHistory}}
    <table>
        <tr class="section-header-row">
            <td colspan="5">HISTORIQUE DES MODIFICATIONS</td>
        </tr>
        <tr>
            <th>Date</th>
            <th>Objet</th>
            <th>Auteurs</th>
            <th>Nature</th>
            <th>Version</th>
        </tr>
        {{range .Metadata.ChangeHistory}}
        <tr>
            <td>{{formatDate .Date}}</td>
            <td>{{.Subject}}</td>
            <td>{{.Authors}}</td>
            <td>{{.Type}}</td>
            <td>{{.Version}}</td>
        </tr>
        {{end}}
    </table>
    {{end}}

    <!-- Process Section Title Page -->
    <div class="section-title-page">
        <div class="section-title-text">PROCESS</div>
    </div>

    <!-- Process Groups as Tables -->
    {{range .ProcessGroups}}
    <table class="process-table">
        <tr class="section-header-row">
            <td colspan="5">{{.Title}}</td>
        </tr>
        <tr>
            <th style="width: 5%;">ETAPE</th>
            <th style="width: 15%;">INTERVENANT</th>
            <th style="width: 50%;">DESCRIPTIONS</th>
            <th style="width: 15%;">OUTPUT</th>
            <th style="width: 15%;">DELAIS</th>
        </tr>
        {{range .ProcessSteps}}
        <tr>
            <td class="step-number">{{.Order}}.</td>
            <td>{{.Responsible}}</td>
            <td>
                <strong>{{.Title}}</strong>
                {{if .Descriptions}}
                {{range .Descriptions}}
                <div style="margin-top: 5px;">
                    <strong>{{.Title}}</strong>
                    {{if .Instructions}}
                    <ul>
                        {{range .Instructions}}
                        <li>{{.}}</li>
                        {{end}}
                    </ul>
                    {{end}}
                </div>
                {{end}}
                {{end}}
            </td>
            <td>
                {{if .Outputs}}
                {{range $index, $output := .Outputs}}
                {{if $index}}<br>{{end}}{{$output}}
                {{end}}
                {{end}}
            </td>
            <td>
                {{if .Durations}}
                {{range $index, $duration := .Durations}}
                {{if $index}}<br>{{end}}{{$duration}}
                {{end}}
                {{end}}
            </td>
        </tr>
        {{end}}
    </table>
    {{end}}

    <!-- Annexes -->
    {{if .Annexes}}
    <!-- Annexes Section Title Page -->
    <div class="section-title-page">
        <div class="section-title-text">ANNEXES</div>
    </div>

    {{range .Annexes}}
    <div class="annex-content" style="margin: 20px 0;">
        <h3 style="color: #FF9500; margin-bottom: 10px;">{{.Title}}</h3>

        {{if eq .Type "diagram"}}
        <!-- Diagram/Image Content -->
        <div class="diagram-wrapper">
            {{$shapes := index .Content "shapes"}}
            {{if $shapes}}
                <!-- Diagram with shapes - render as SVG -->
                {{renderDiagramSVG $shapes}}
            {{else if .Files}}
                {{range .Files}}
                <img src="http://localhost/files/{{.MinioObjectName}}" alt="{{.OriginalName}}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
                {{end}}
            {{else if index .Content "url"}}
                <img src="{{index .Content "url"}}" alt="{{.Title}}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 10px;">
            {{else if index .Content "imageUrl"}}
                <img src="{{index .Content "imageUrl"}}" alt="{{.Title}}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 10px;">
            {{else if index .Content "html"}}
                {{index .Content "html"}}
            {{else}}
                <div style="border: 2px dashed #ddd; padding: 20px; text-align: center; color: #666;">
                    <p>📊 Diagram: {{.Title}}</p>
                </div>
            {{end}}
        </div>

        {{else if eq .Type "text"}}
        <!-- Rich Text Content -->
        <div class="rich-text-content">
            {{if index .Content "html"}}
                {{index .Content "html"}}
            {{else if index .Content "content"}}
                {{index .Content "content"}}
            {{else}}
                <p>{{.Content}}</p>
            {{end}}
        </div>

        {{else if eq .Type "table"}}
        <!-- Table Content -->
        <div class="annex-table-wrapper">
            {{if index .Content "html"}}
                <!-- If table is stored as HTML -->
                {{index .Content "html"}}
            {{else if index .Content "rows"}}
                <!-- If table is stored as structured data -->
                <table class="annex-table">
                    {{if index .Content "headers"}}
                    <thead>
                        <tr>
                            {{range index .Content "headers"}}
                            <th>{{.}}</th>
                            {{end}}
                        </tr>
                    </thead>
                    {{end}}
                    <tbody>
                        {{range index .Content "rows"}}
                        <tr>
                            {{range .}}
                            <td>{{.}}</td>
                            {{end}}
                        </tr>
                        {{end}}
                    </tbody>
                </table>
            {{else}}
                <p style="color: #666;">Table: {{.Title}}</p>
            {{end}}
        </div>

        {{else if eq .Type "file"}}
        <!-- File Attachments - Check if they're images first -->
        <div class="file-attachments">
            {{if .Files}}
                {{range .Files}}
                    {{if or (eq .ContentType "image/png") (eq .ContentType "image/jpeg") (eq .ContentType "image/jpg") (eq .ContentType "image/gif") (eq .ContentType "image/svg+xml") (eq .ContentType "image/webp")}}
                        <!-- Render as image if it's an image file -->
                        <img src="http://localhost/files/{{.MinioObjectName}}" alt="{{.OriginalName}}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
                        <p style="color: #666; font-size: 8pt; margin-top: 5px;">{{.OriginalName}} ({{.FileSize}} bytes)</p>
                    {{else}}
                        <!-- Render as file link for non-image files -->
                        <ul class="file-list" style="list-style: none; padding: 0;">
                            <li>
                                <span class="file-icon">📎</span>
                                <span style="color: #FF9500;">{{.OriginalName}}</span>
                                {{if .FileSize}}
                                <span style="color: #666; font-size: 8pt;"> ({{.FileSize}} bytes)</span>
                                {{end}}
                                <br>
                                <span style="color: #999; font-size: 8pt;">Type: {{.ContentType}}</span>
                            </li>
                        </ul>
                    {{end}}
                {{end}}
            {{else if index .Content "files"}}
                {{range index .Content "files"}}
                    {{$fileType := index . "type"}}
                    {{if or (eq $fileType "image/png") (eq $fileType "image/jpeg") (eq $fileType "image/jpg") (eq $fileType "image/gif") (eq $fileType "image/svg+xml") (eq $fileType "image/webp")}}
                        <!-- Render as image if it's an image file -->
                        {{if index . "url"}}
                        <div style="margin: 10px 0;">
                            <img src="{{index . "url"}}" alt="{{index . "name"}}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 10px;">
                            <p style="color: #666; font-size: 8pt; margin-top: 5px;">
                                {{index . "name"}}
                                {{if index . "size"}} ({{index . "size"}} bytes){{end}}
                            </p>
                        </div>
                        {{end}}
                    {{else}}
                        <!-- Render as file link for non-image files -->
                        <ul class="file-list" style="list-style: none; padding: 0;">
                            <li>
                                <span class="file-icon">📎</span>
                                {{if index . "url"}}
                                <a href="{{index . "url"}}" target="_blank" style="color: #FF9500; text-decoration: none;">
                                    {{if index . "name"}}{{index . "name"}}{{else}}File{{end}}
                                </a>
                                {{else}}
                                <span style="color: #FF9500;">
                                    {{if index . "name"}}{{index . "name"}}{{else}}File{{end}}
                                </span>
                                {{end}}
                                {{if index . "size"}}
                                <span style="color: #666; font-size: 8pt;"> ({{index . "size"}} bytes)</span>
                                {{end}}
                            </li>
                        </ul>
                    {{end}}
                {{end}}
            {{else}}
                <p style="color: #666;">No files attached</p>
            {{end}}
        </div>
        {{end}}
    </div>
    {{end}}
    {{end}}

    <!-- Footer - Fixed at bottom of each page -->
    <div class="page-footer">
        <div class="footer-content">
            <div class="footer-left">
                Place de la Réconciliation – (Quartier Atchanté)<br>
                Boîte postale : 333 – Lomé – Togo<br>
                <span class="footer-tagline">Avancer. Pour vous. Pour Tous.</span>
            </div>
            <div class="footer-center">
                <span class="page-number"></span>
            </div>
            <div class="footer-right">
                Téléphone : +228 22 53 44 01<br>
                E-mail : spdgtgt@togotelecom.tg<br>
                Site web : togocom.tg
            </div>
        </div>
    </div>

    <script>
        // Display page number for HTML view only
        // In print/PDF, leave empty so CSS counter works
        document.addEventListener('DOMContentLoaded', function() {
            const pageNumber = document.querySelector('.page-number');
            if (pageNumber) {
                // For HTML view only, show "1"
                // In print/PDF context, leave empty for CSS counter
                if (!window.matchMedia || !window.matchMedia('print').matches) {
                    pageNumber.textContent = '1';
                }
            }
        });
    </script>
</body>
</html>
`
