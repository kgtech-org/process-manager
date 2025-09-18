package helpers

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/kodesonik/process-manager/internal/models"
)

// Validator is a singleton validator instance
var validate = validator.New()

// ValidateRequest validates a request struct and returns validation errors
func ValidateRequest(req interface{}) []models.ValidationError {
	err := validate.Struct(req)
	if err == nil {
		return nil
	}

	var errors []models.ValidationError
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, models.ValidationError{
			Field:   formatFieldName(err.Field()),
			Message: formatValidationMessage(err),
			Tag:     err.Tag(),
		})
	}
	return errors
}

// BindAndValidate binds JSON request and validates it
func BindAndValidate(c *gin.Context, req interface{}) error {
	if err := c.ShouldBindJSON(req); err != nil {
		return fmt.Errorf("invalid JSON format: %w", err)
	}

	if errors := ValidateRequest(req); errors != nil {
		SendValidationError(c, "Validation failed", fmt.Errorf("validation errors: %v", errors))
		return fmt.Errorf("validation failed")
	}

	return nil
}

// SendValidationErrors handles validation error responses
func SendValidationErrors(c *gin.Context, err error) {
	if err.Error() == "validation failed" {
		// Validation already handled by BindAndValidate
		return
	}

	// Handle JSON binding errors
	SendBadRequest(c, "Invalid request format", err.Error())
}

// ValidateQueryParams validates query parameters
func ValidateQueryParams(c *gin.Context, params interface{}) error {
	if err := c.ShouldBindQuery(params); err != nil {
		return fmt.Errorf("invalid query parameters: %w", err)
	}

	if errors := ValidateRequest(params); errors != nil {
		SendValidationError(c, "Invalid query parameters", fmt.Errorf("validation errors: %v", errors))
		return fmt.Errorf("invalid query parameters")
	}

	return nil
}

// ValidatePathParam validates a path parameter
func ValidatePathParam(c *gin.Context, paramName string, validator func(string) error) (string, error) {
	value := c.Param(paramName)
	if value == "" {
		c.JSON(400, models.NewErrorResponse(
			fmt.Sprintf("Missing required parameter: %s", paramName),
			models.CodeInvalidRequest,
		))
		return "", fmt.Errorf("missing parameter: %s", paramName)
	}

	if validator != nil {
		if err := validator(value); err != nil {
			c.JSON(400, models.NewErrorResponse(
				fmt.Sprintf("Invalid %s: %s", paramName, err.Error()),
				models.CodeInvalidRequest,
			))
			return "", err
		}
	}

	return value, nil
}

// formatFieldName converts struct field names to snake_case
func formatFieldName(field string) string {
	// Convert from PascalCase to snake_case
	var result strings.Builder
	for i, r := range field {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// formatValidationMessage creates user-friendly validation messages
func formatValidationMessage(err validator.FieldError) string {
	field := formatFieldName(err.Field())

	switch err.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, err.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, err.Param())
	case "len":
		return fmt.Sprintf("%s must be exactly %s characters", field, err.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, err.Param())
	case "gt":
		return fmt.Sprintf("%s must be greater than %s", field, err.Param())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, err.Param())
	case "lt":
		return fmt.Sprintf("%s must be less than %s", field, err.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, err.Param())
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

