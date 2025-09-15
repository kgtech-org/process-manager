package i18n

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed locales/fr.json
var frJSON []byte

//go:embed locales/en.json
var enJSON []byte

type I18n struct {
	translations map[string]map[string]interface{}
	defaultLang  string
}

var instance *I18n

// Initialize sets up the i18n instance with translations
func Initialize() error {
	instance = &I18n{
		translations: make(map[string]map[string]interface{}),
		defaultLang:  "fr", // French as default
	}

	// Load French translations
	var frTranslations map[string]interface{}
	if err := json.Unmarshal(frJSON, &frTranslations); err != nil {
		return fmt.Errorf("failed to parse French translations: %w", err)
	}
	instance.translations["fr"] = frTranslations

	// Load English translations
	var enTranslations map[string]interface{}
	if err := json.Unmarshal(enJSON, &enTranslations); err != nil {
		return fmt.Errorf("failed to parse English translations: %w", err)
	}
	instance.translations["en"] = enTranslations

	return nil
}

// GetInstance returns the i18n instance
func GetInstance() *I18n {
	if instance == nil {
		Initialize()
	}
	return instance
}

// T translates a key for the given language
func T(lang, key string, args ...interface{}) string {
	return GetInstance().Translate(lang, key, args...)
}

// Translate translates a key for the given language
func (i *I18n) Translate(lang, key string, args ...interface{}) string {
	// Default to French if language not found
	if _, ok := i.translations[lang]; !ok {
		lang = i.defaultLang
	}

	// Get the translation map for the language
	langMap := i.translations[lang]

	// Navigate through nested keys (e.g., "auth.login.success")
	keys := strings.Split(key, ".")
	var value interface{} = langMap

	for _, k := range keys {
		if m, ok := value.(map[string]interface{}); ok {
			value = m[k]
		} else {
			// Key not found, try fallback language
			if lang != i.defaultLang {
				return i.Translate(i.defaultLang, key, args...)
			}
			return key // Return the key itself if translation not found
		}
	}

	// Convert to string and format with arguments if provided
	if str, ok := value.(string); ok {
		if len(args) > 0 {
			return fmt.Sprintf(str, args...)
		}
		return str
	}

	// If not a string, return the key
	return key
}

// GetLanguageFromContext extracts language from Gin context
func GetLanguageFromContext(c *gin.Context) string {
	// Check Accept-Language header
	lang := c.GetHeader("Accept-Language")
	if lang != "" {
		// Extract the primary language code (e.g., "fr-FR" -> "fr")
		parts := strings.Split(lang, ",")
		if len(parts) > 0 {
			langCode := strings.Split(parts[0], "-")[0]
			langCode = strings.TrimSpace(strings.ToLower(langCode))
			if langCode == "en" || langCode == "fr" {
				return langCode
			}
		}
	}

	// Check X-Language header (custom header for explicit language selection)
	lang = c.GetHeader("X-Language")
	if lang == "en" || lang == "fr" {
		return lang
	}

	// Check query parameter
	lang = c.Query("lang")
	if lang == "en" || lang == "fr" {
		return lang
	}

	// Default to French
	return "fr"
}

// Middleware adds i18n support to Gin context
func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		lang := GetLanguageFromContext(c)
		c.Set("lang", lang)
		c.Next()
	}
}

// TFromContext translates using language from context
func TFromContext(c *gin.Context, key string, args ...interface{}) string {
	lang, _ := c.Get("lang")
	if langStr, ok := lang.(string); ok {
		return T(langStr, key, args...)
	}
	return T("fr", key, args...)
}