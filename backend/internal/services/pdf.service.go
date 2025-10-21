package services

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"github.com/kodesonik/process-manager/internal/models"
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

	// Convert HTML to PDF using chromedp
	pdfBytes, err := s.htmlToPDF(ctx, html)
	if err != nil {
		return "", fmt.Errorf("failed to convert HTML to PDF: %w", err)
	}

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
	// Create a new browser context with timeout
	allocCtx, cancel := chromedp.NewContext(ctx)
	defer cancel()

	// Set a timeout for PDF generation
	allocCtx, cancel = context.WithTimeout(allocCtx, 30*time.Second)
	defer cancel()

	var pdfBuf []byte

	// Navigate to a data URL and print to PDF
	if err := chromedp.Run(allocCtx,
		chromedp.Navigate("data:text/html,"+html),
		chromedp.ActionFunc(func(ctx context.Context) error {
			var err error
			pdfBuf, _, err = page.PrintToPDF().
				WithPrintBackground(true).
				WithPaperWidth(8.27).  // A4 width in inches
				WithPaperHeight(11.7). // A4 height in inches
				WithMarginTop(0.4).
				WithMarginBottom(0.4).
				WithMarginLeft(0.4).
				WithMarginRight(0.4).
				WithPreferCSSPageSize(false).
				Do(ctx)
			return err
		}),
	); err != nil {
		return nil, err
	}

	return pdfBuf, nil
}

// renderDocumentHTML renders the document as HTML using template
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
            size: A4;
            margin: 15mm;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #FF9500;
        }

        .logo-section {
            flex: 1;
        }

        .company-name {
            font-size: 14pt;
            font-weight: bold;
            color: #FF9500;
            margin-bottom: 2px;
        }

        .company-tagline {
            font-size: 8pt;
            color: #666;
            font-style: italic;
        }

        .contact-info {
            text-align: right;
            font-size: 8pt;
            color: #666;
        }

        .page-title {
            background-color: #FF9500;
            color: white;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }

        .page-title h1 {
            font-size: 16pt;
            margin: 0;
        }

        .page-title .reference {
            font-size: 11pt;
            margin-top: 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            page-break-inside: auto;
        }

        table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background-color: #FF9500;
            color: white;
            font-weight: bold;
        }

        .section-header {
            background-color: #FFF3E0;
            border-left: 4px solid #FF9500;
            padding: 10px;
            margin: 20px 0 10px 0;
            font-weight: bold;
            font-size: 12pt;
        }

        .signature-table th {
            width: 25%;
        }

        .signature-cell {
            height: 60px;
        }

        .metadata-list {
            list-style-type: disc;
            margin-left: 20px;
            margin-bottom: 15px;
        }

        .metadata-list li {
            margin-bottom: 5px;
        }

        .glossary-table td:first-child {
            font-weight: bold;
            width: 30%;
            background-color: #F5F5F5;
        }

        .process-group {
            margin: 20px 0;
        }

        .process-group-title {
            background-color: #FF9500;
            color: white;
            padding: 10px;
            font-weight: bold;
            font-size: 11pt;
        }

        .process-step {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #DDD;
            border-left: 4px solid #FF9500;
        }

        .step-number {
            font-weight: bold;
            color: #FF9500;
            font-size: 11pt;
        }

        .step-description {
            margin: 5px 0;
        }

        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 8pt;
            color: #666;
            padding: 10px 0;
            border-top: 1px solid #DDD;
        }

        @media print {
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="logo-section">
            <div class="company-name">TOGOCOM</div>
            <div class="company-tagline">TOGOCEL | TOGO TELECOM</div>
            <div class="company-tagline">Filiales du Groupe Togocom</div>
        </div>
        <div class="contact-info">
            Place de la Réconciliation – (Quartier Atchanté)<br>
            Boîte postale : 333 – Lomé – Togo<br>
            Téléphone : +228 22 53 44 01<br>
            E-mail : spdgtgt@togotelecom.tg<br>
            Site web : togocom.tg<br>
            <strong>Avancer. Pour vous. Pour Tous.</strong>
        </div>
    </div>

    <!-- Title Page -->
    <div class="page-title">
        <div class="reference">Référence: {{.Reference}} v{{.Version}}</div>
        <h1>{{.Title}}</h1>
    </div>

    <!-- Contributors Signature Tables -->
    <div class="section-header">Document Préparé par (Auteurs)</div>
    <table class="signature-table">
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
    <div class="section-header">Equipe de Vérification</div>
    <table class="signature-table">
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
    <div class="section-header">Equipe de Validation</div>
    <table class="signature-table">
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

    <!-- Page break for new section -->
    <div class="page-break"></div>

    <!-- Objectives Section -->
    {{if .Metadata.Objectives}}
    <div class="section-header">OBJECTIFS DE LA PROCEDURE</div>
    <ul class="metadata-list">
        {{range .Metadata.Objectives}}
        <li>{{.}}</li>
        {{end}}
    </ul>
    {{end}}

    <!-- Implicated Actors Section -->
    {{if .Metadata.ImplicatedActors}}
    <div class="section-header">PRINCIPAUX INTERVENANTS</div>
    <ul class="metadata-list">
        {{range .Metadata.ImplicatedActors}}
        <li>{{.}}</li>
        {{end}}
    </ul>
    {{end}}

    <!-- Management Rules Section -->
    {{if .Metadata.ManagementRules}}
    <div class="section-header">REGLES DE GESTION</div>
    <ul class="metadata-list">
        {{range .Metadata.ManagementRules}}
        <li>{{.}}</li>
        {{end}}
    </ul>
    {{end}}

    <!-- Terminology Section -->
    {{if .Metadata.Terminology}}
    <div class="section-header">DEFINITION DES TERMES - SIGLES – ABREVIATIONS</div>
    <table class="glossary-table">
        {{range .Metadata.Terminology}}
        <tr>
            <td colspan="2">{{.}}</td>
        </tr>
        {{end}}
    </table>
    {{end}}

    <!-- Change History -->
    {{if .Metadata.ChangeHistory}}
    <div class="section-header">HISTORIQUE DES MODIFICATIONS</div>
    <table>
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

    <!-- Page break for process groups -->
    <div class="page-break"></div>

    <!-- Process Groups -->
    {{range .ProcessGroups}}
    <div class="process-group">
        <div class="process-group-title">{{.Title}}</div>
        <div style="padding: 10px;">
            {{range .ProcessSteps}}
            <div class="process-step">
                <div class="step-number">{{.Order}}. {{.Title}}</div>
                {{if .Responsible}}
                <div style="margin-top: 5px;"><strong>Responsable:</strong> {{.Responsible}}</div>
                {{end}}
                {{if .Descriptions}}
                <div class="step-description">
                    {{range .Descriptions}}
                    <div style="margin-top: 5px;">
                        <strong>{{.Title}}</strong>
                        {{if .Instructions}}
                        <ul style="margin: 5px 0 5px 20px;">
                            {{range .Instructions}}
                            <li>{{.}}</li>
                            {{end}}
                        </ul>
                        {{end}}
                    </div>
                    {{end}}
                </div>
                {{end}}
                {{if .Outputs}}
                <div style="margin-top: 5px;"><strong>Résultats:</strong>
                    {{range $index, $output := .Outputs}}
                    {{if $index}}, {{end}}{{$output}}
                    {{end}}
                </div>
                {{end}}
                {{if .Durations}}
                <div><strong>Délais:</strong>
                    {{range $index, $duration := .Durations}}
                    {{if $index}}, {{end}}{{$duration}}
                    {{end}}
                </div>
                {{end}}
            </div>
            {{end}}
        </div>
    </div>
    {{end}}

    <!-- Annexes -->
    {{if .Annexes}}
    <div class="page-break"></div>
    <div class="section-header">ANNEXES</div>
    {{range .Annexes}}
    <div style="margin: 20px 0;">
        <h3 style="color: #FF9500;">{{.Title}}</h3>
        {{if eq .Type "table"}}
        <!-- Render table content -->
        <div style="margin: 10px 0;">Tableau: {{.Title}}</div>
        {{else if eq .Type "diagram"}}
        <!-- Render diagram reference -->
        <div style="margin: 10px 0;">Diagramme: {{.Title}}</div>
        {{else}}
        <div style="margin: 10px 0;">{{.Title}}</div>
        {{end}}
    </div>
    {{end}}
    {{end}}

    <!-- Footer with metadata -->
    <div class="footer">
        Document généré le {{formatDateTime .UpdatedAt}} | Version {{.Version}} | Statut: {{.Status}}
    </div>
</body>
</html>
`
