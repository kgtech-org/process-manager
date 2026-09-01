package services_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kodesonik/process-manager/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// capturedRequest holds the decoded body of a request the fake OpenAI server received.
type capturedRequest struct {
	Path string
	Body map[string]any
}

// fakeOpenAI stands in for api.openai.com so the Responses/Conversations wiring can be
// asserted without network access or API credits. Handlers are keyed by request path.
type fakeOpenAI struct {
	server   *httptest.Server
	requests []capturedRequest
}

func newFakeOpenAI(t *testing.T) *fakeOpenAI {
	t.Helper()

	f := &fakeOpenAI{}
	f.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := map[string]any{}
		if raw, err := io.ReadAll(r.Body); err == nil && len(raw) > 0 {
			_ = json.Unmarshal(raw, &body)
		}
		f.requests = append(f.requests, capturedRequest{Path: r.URL.Path, Body: body})

		w.Header().Set("Content-Type", "application/json")

		switch {
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/conversations"):
			_, _ = w.Write([]byte(`{"id":"conv_test123","object":"conversation","created_at":1}`))
		case r.Method == http.MethodDelete && strings.Contains(r.URL.Path, "/conversations/"):
			_, _ = w.Write([]byte(`{"id":"conv_test123","object":"conversation.deleted","deleted":true}`))
		case r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/responses"):
			_, _ = w.Write([]byte(`{
				"id":"resp_test123",
				"object":"response",
				"status":"completed",
				"output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Bonjour, voici la procédure."}]}]
			}`))
		default:
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":{"message":"unexpected path"}}`))
		}
	}))
	t.Cleanup(f.server.Close)

	return f
}

// findRequest returns the first captured request whose path ends with suffix.
func (f *fakeOpenAI) findRequest(suffix string) (capturedRequest, bool) {
	for _, req := range f.requests {
		if strings.HasSuffix(req.Path, suffix) {
			return req, true
		}
	}
	return capturedRequest{}, false
}

// countRequests returns how many captured requests have a path ending with suffix.
func (f *fakeOpenAI) countRequests(suffix string) int {
	count := 0
	for _, req := range f.requests {
		if strings.HasSuffix(req.Path, suffix) {
			count++
		}
	}
	return count
}

func newTestService(t *testing.T, fake *fakeOpenAI) *services.OpenAIService {
	t.Helper()

	t.Setenv("OPENAI_API_KEY", "test-key")
	t.Setenv("OPENAI_BASE_URL", fake.server.URL+"/v1")
	t.Setenv("OPENAI_VECTOR_STORE_ID", "vs_test456")
	t.Setenv("OPENAI_MODEL", "gpt-5.4-mini")

	service, err := services.NewOpenAIService()
	require.NoError(t, err)

	return service
}

func TestNewOpenAIServiceRequiresAPIKey(t *testing.T) {
	t.Setenv("OPENAI_API_KEY", "")

	_, err := services.NewOpenAIService()

	assert.Error(t, err)
}

func TestSendMessageCreatesConversationWhenNoneGiven(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	reply, conversationID, err := service.SendMessage(context.Background(), "Comment traiter un incident ?", "", "")

	require.NoError(t, err)
	assert.Equal(t, "Bonjour, voici la procédure.", reply)
	assert.Equal(t, "conv_test123", conversationID)
	assert.Equal(t, 1, fake.countRequests("/conversations"))
}

func TestSendMessageReusesExistingConversation(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	_, conversationID, err := service.SendMessage(context.Background(), "Et ensuite ?", "conv_existing789", "")

	require.NoError(t, err)
	assert.Equal(t, "conv_existing789", conversationID)
	assert.Equal(t, 0, fake.countRequests("/conversations"), "an existing conversation must not be recreated")

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)
	assert.Equal(t, "conv_existing789", req.Body["conversation"])
}

// Threads created by the retired Assistants API are dead: their IDs must never be
// forwarded as a conversation, or the API answers 404.
func TestSendMessageDiscardsLegacyThreadID(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	_, conversationID, err := service.SendMessage(context.Background(), "Bonjour", "thread_legacyABC", "")

	require.NoError(t, err)
	assert.Equal(t, "conv_test123", conversationID)
	assert.Equal(t, 1, fake.countRequests("/conversations"))

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)
	assert.Equal(t, "conv_test123", req.Body["conversation"])
}

func TestSendMessageAttachesFileSearchToolWithVectorStore(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	_, _, err := service.SendMessage(context.Background(), "Quelle est la procédure ?", "conv_existing789", "")
	require.NoError(t, err)

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)

	tools, ok := req.Body["tools"].([]any)
	require.True(t, ok, "request must declare tools")
	require.Len(t, tools, 1)

	tool, ok := tools[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, "file_search", tool["type"])
	assert.Equal(t, []any{"vs_test456"}, tool["vector_store_ids"])
}

func TestSendMessageUsesConfiguredModel(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	_, _, err := service.SendMessage(context.Background(), "Bonjour", "conv_existing789", "")
	require.NoError(t, err)

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)
	assert.Equal(t, "gpt-5.4-mini", req.Body["model"])
}

// The persona used to live on the Assistant object; it now travels as instructions on
// every call, with the caller's per-user context appended rather than replacing it.
func TestSendMessageMergesUserContextIntoInstructions(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	userContext := "[Contexte utilisateur] Département: Réseau, Poste: Ingénieur."
	_, _, err := service.SendMessage(context.Background(), "Bonjour", "conv_existing789", userContext)
	require.NoError(t, err)

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)

	instructions, ok := req.Body["instructions"].(string)
	require.True(t, ok, "request must carry instructions")
	assert.Contains(t, instructions, "Togocom", "the base persona must survive")
	assert.Contains(t, instructions, userContext, "the user context must be appended")
}

func TestSendMessageWithoutUserContextStillSendsPersona(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	_, _, err := service.SendMessage(context.Background(), "Bonjour", "conv_existing789", "")
	require.NoError(t, err)

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)

	instructions, ok := req.Body["instructions"].(string)
	require.True(t, ok)
	assert.Contains(t, instructions, "Togocom")
}

func TestSendMessageSendsUserMessageAsInput(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	_, _, err := service.SendMessage(context.Background(), "Comment escalader un incident ?", "conv_existing789", "")
	require.NoError(t, err)

	req, ok := fake.findRequest("/responses")
	require.True(t, ok)
	assert.Equal(t, "Comment escalader un incident ?", req.Body["input"])
}

func TestDeleteConversationCallsAPI(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	err := service.DeleteConversation(context.Background(), "conv_test123")

	require.NoError(t, err)
	assert.Equal(t, 1, fake.countRequests("/conversations/conv_test123"))
}

func TestDeleteConversationIgnoresEmptyAndLegacyIDs(t *testing.T) {
	fake := newFakeOpenAI(t)
	service := newTestService(t, fake)

	require.NoError(t, service.DeleteConversation(context.Background(), ""))
	require.NoError(t, service.DeleteConversation(context.Background(), "thread_legacyABC"))

	assert.Empty(t, fake.requests, "nothing to delete server-side, so no call should be made")
}
