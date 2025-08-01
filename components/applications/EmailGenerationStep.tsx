"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle,
  Edit,
  Save,
  X,
  Lightbulb,
  Send,
} from "lucide-react";
import { useApplicationWorkflowStore } from "@/store/application-workflow";
import { AIGeneratedEmail } from "@/lib/ai/email-generator";
import { useAuth } from "@/hooks/useAuth";
import { SendEmailModal } from "@/components/email/SendEmailModal";

export function EmailGenerationStep() {
  const {
    selectedJob,
    selectedResume,
    generatedEmail,
    emailOptions,
    isGeneratingEmail,
    setGeneratedEmail,
    setEmailOptions,
    setGeneratingEmail,
    setError,
    setSelectedJob,
    setSelectedResume,
    goToStep,
  } = useApplicationWorkflowStore();

  const { user, loading: authLoading } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(
    emailOptions.customInstructions
  );
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  useEffect(() => {
    if (generatedEmail) {
      setEditedSubject(generatedEmail.subject);
      setEditedBody(generatedEmail.body);
    }
  }, [generatedEmail]);

  const generateEmail = useCallback(async () => {
    if (!selectedJob || !selectedResume) {
      setError("Job and resume must be selected");
      return;
    }

    // Debug: Log when generation starts
    console.log("📧 Starting email generation:", {
      hasJob: !!selectedJob,
      hasResume: !!selectedResume,
      hasUser: !!user,
      userId: user?.id,
      authLoading,
      timestamp: new Date().toISOString(),
    });

    setGeneratingEmail(true);
    setError(null);
    // Set empty initial state for smooth streaming
    setGeneratedEmail({
      subject: "",
      body: "",
      keypoints: [],
      tone: emailOptions.tone,
    });

    try {
      const response = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          jobPosting: {
            id: selectedJob.id,
            title: selectedJob.title,
            company_name: selectedJob.company_name,
            description: selectedJob.description,
            requirements: selectedJob.requirements,
            location: selectedJob.location,
            salary_range: selectedJob.salary_range,
          },
          resumeContent: selectedResume.content,
          options: {
            ...emailOptions,
            customInstructions,
          },
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate email");
      }

      // Handle streaming response
      if (response.headers.get("content-type")?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const currentEmail = {
          subject: "",
          body: "",
          keypoints: [],
          tone: emailOptions.tone,
        };
        
        let updateTimer: NodeJS.Timeout | null = null;
        let pendingUpdate = { ...currentEmail };

        // Batch updates for smoother rendering
        const applyUpdate = () => {
          setGeneratedEmail({ ...pendingUpdate });
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.error) {
                    throw new Error(data.error);
                  }

                  // Handle complete email data
                  if (data.email) {
                    // Replace completely with structured data, don't append
                    pendingUpdate = {
                      subject: data.email.subject,
                      body: data.email.body,
                      keypoints: data.email.keypoints || [],
                      tone: data.email.tone || emailOptions.tone,
                    };
                    // Apply immediately for structured email data
                    if (updateTimer) clearTimeout(updateTimer);
                    setGeneratedEmail({ ...pendingUpdate });
                  }
                  // Handle streaming content (body only) - for progress indication
                  else if (data.content) {
                    // Only accumulate content if we don't have structured data yet
                    if (!pendingUpdate.subject) {
                      pendingUpdate.body += data.content;
                    }
                    // Batch updates for streaming content
                    if (updateTimer) clearTimeout(updateTimer);
                    updateTimer = setTimeout(applyUpdate, 50);
                  }
                  // Handle other streaming data
                  else if (data.subject) {
                    pendingUpdate.subject = data.subject;
                    if (updateTimer) clearTimeout(updateTimer);
                    updateTimer = setTimeout(applyUpdate, 50);
                  }
                  else if (data.keypoints) {
                    pendingUpdate.keypoints = data.keypoints;
                    if (updateTimer) clearTimeout(updateTimer);
                    updateTimer = setTimeout(applyUpdate, 50);
                  }

                  if (data.done) {
                    // Apply final update immediately
                    if (updateTimer) clearTimeout(updateTimer);
                    applyUpdate();
                    break;
                  }
                } catch {
                  // Skip invalid JSON lines
                  continue;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // Fallback to non-streaming response
        const data = await response.json();
        setGeneratedEmail(data.email);
      }

      // Update custom instructions in store
      setEmailOptions({ customInstructions });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  }, [
    selectedJob,
    selectedResume,
    emailOptions,
    customInstructions,
    setGeneratingEmail,
    setError,
    setGeneratedEmail,
    setEmailOptions,
    user,
    authLoading,
  ]);

  const regenerateEmail = async () => {
    await generateEmail();
  };

  const enhanceEmail = async (feedback: string) => {
    if (!selectedJob || !selectedResume || !generatedEmail) return;

    setGeneratingEmail(true);
    setError(null);
    
    // Keep existing content visible during enhancement
    // The streaming will update it smoothly

    try {
      const response = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          jobPosting: {
            id: selectedJob.id,
            title: selectedJob.title,
            company_name: selectedJob.company_name,
            description: selectedJob.description,
            requirements: selectedJob.requirements,
            location: selectedJob.location,
            salary_range: selectedJob.salary_range,
          },
          resumeContent: selectedResume.content,
          existingEmail: generatedEmail.body,
          feedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to enhance email");
      }

      const data = await response.json();
      setGeneratedEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enhance email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const saveEdits = () => {
    if (generatedEmail) {
      const updatedEmail: AIGeneratedEmail = {
        ...generatedEmail,
        subject: editedSubject,
        body: editedBody,
      };
      setGeneratedEmail(updatedEmail);
    }
    setIsEditing(false);
  };

  const cancelEdits = () => {
    if (generatedEmail) {
      setEditedSubject(generatedEmail.subject);
      setEditedBody(generatedEmail.body);
    }
    setIsEditing(false);
  };

  const copyToClipboard = async (text: string, type: "subject" | "body") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleToneChange = (tone: "professional" | "friendly" | "formal") => {
    setEmailOptions({ tone });
  };

  const handleAttachmentsChange = (includeAttachments: boolean) => {
    setEmailOptions({ includeAttachments });
  };

  // Auto-generate on first load if we have job and resume
  useEffect(() => {
    // Debug: Log auto-generation trigger conditions
    console.log("🔄 Auto-generation effect triggered:", {
      hasJob: !!selectedJob,
      hasResume: !!selectedResume,
      hasGeneratedEmail: !!generatedEmail,
      isGenerating: isGeneratingEmail,
      hasUser: !!user,
      userId: user?.id,
      authLoading,
      willGenerate:
        selectedJob &&
        selectedResume &&
        !generatedEmail &&
        !isGeneratingEmail &&
        user &&
        !authLoading,
      timestamp: new Date().toISOString(),
    });

    // Wait for auth to load and ensure user is authenticated before auto-generating
    if (
      selectedJob &&
      selectedResume &&
      !generatedEmail &&
      !isGeneratingEmail &&
      user &&
      !authLoading
    ) {
      console.log("✅ Auto-generating email...");
      generateEmail();
    } else if (
      selectedJob &&
      selectedResume &&
      !generatedEmail &&
      !isGeneratingEmail &&
      !authLoading &&
      !user
    ) {
      console.log("❌ Cannot auto-generate: user not authenticated");
      setError("Please log in to generate emails");
    }
  }, [
    selectedJob,
    selectedResume,
    generatedEmail,
    isGeneratingEmail,
    generateEmail,
    user,
    authLoading,
    setError,
  ]);

  if (!selectedJob || !selectedResume) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-2">Missing Requirements</div>
        <p className="text-sm text-muted-foreground">
          Please select both a job and resume in the previous steps
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Job & Resume Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Job Info */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div>
                <div className="text-xs text-blue-600 font-medium">
                  Applying For
                </div>
                <div className="font-semibold text-sm">{selectedJob.title}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedJob.company_name}
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-300"></div>

            {/* Resume Info */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <div className="text-xs text-green-600 font-medium">
                  Using Resume
                </div>
                <div className="font-semibold text-sm">
                  {selectedResume.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedResume.content.contact.name || "Name not set"}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => {
                setSelectedJob(null);
                goToStep(0); // Go to job selection step
              }}
            >
              Change Job
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => {
                setSelectedResume(null);
                goToStep(1); // Go to resume selection step
              }}
            >
              Change Resume
            </Button>
          </div>
        </div>
      </div>

      {/* Email Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone">Email Tone</Label>
              <Select
                value={emailOptions.tone}
                onValueChange={handleToneChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="attachments"
                checked={emailOptions.includeAttachments}
                onChange={(e) => handleAttachmentsChange(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="attachments">Mention resume attachment</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">
              Additional Instructions (Optional)
            </Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Mention specific skills, highlight certain experiences..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate/Regenerate Button */}
      <div className="flex justify-center py-2">
        <Button
          onClick={generatedEmail ? regenerateEmail : generateEmail}
          disabled={isGeneratingEmail}
          size="default"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isGeneratingEmail ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : generatedEmail ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Email
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Application Email
            </>
          )}
        </Button>
      </div>

      {/* Generated Email */}
      {generatedEmail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {isGeneratingEmail ? (
                  <>
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <span>Generating Application Email...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Generated Application Email</span>
                  </>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="capitalize">
                  {generatedEmail.tone}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject Line */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Subject Line</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      isEditing ? editedSubject : generatedEmail.subject,
                      "subject"
                    )
                  }
                >
                  {copied === "subject" ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md font-medium min-h-[2.5rem] flex items-center">
                  {generatedEmail.subject || (isGeneratingEmail && <span className="text-muted-foreground">Generating subject</span>)}
                  {isGeneratingEmail && generatedEmail.subject && (
                    <span className="inline-block ml-0.5">▌</span>
                  )}
                </div>
              )}
            </div>

            {/* Email Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Email Body</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      isEditing ? editedBody : generatedEmail.body,
                      "body"
                    )
                  }
                >
                  {copied === "body" ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              ) : (
                <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap text-sm font-mono min-h-[200px] max-h-[400px] overflow-y-auto">
                  {generatedEmail.body}
                  {isGeneratingEmail && (
                    <span className="inline-block ml-0.5">▌</span>
                  )}
                </div>
              )}
            </div>

            {/* Save/Cancel for editing */}
            {isEditing && (
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={cancelEdits}>
                  Cancel
                </Button>
                <Button onClick={saveEdits}>
                  <Save className="h-3 w-3 mr-1" />
                  Save Changes
                </Button>
              </div>
            )}

            {/* Send Email Button */}
            {!isEditing && (
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  onClick={() => setSendEmailModalOpen(true)}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            )}

            {/* Key Points */}
            {generatedEmail.keypoints &&
              generatedEmail.keypoints.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
                    Key Selling Points
                  </Label>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {generatedEmail.keypoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Quick Enhancement Options */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  enhanceEmail(
                    "Make it more enthusiastic and show more passion for the role"
                  )
                }
                disabled={isGeneratingEmail}
              >
                More Enthusiastic
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  enhanceEmail("Make it more concise and to the point")
                }
                disabled={isGeneratingEmail}
              >
                More Concise
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  enhanceEmail(
                    "Add more specific details about relevant experience"
                  )
                }
                disabled={isGeneratingEmail}
              >
                More Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        open={sendEmailModalOpen}
        onOpenChange={setSendEmailModalOpen}
        initialTo=""
        initialSubject={generatedEmail?.subject || ""}
        initialBody={generatedEmail?.body || ""}
        onEmailSent={() => {
          // Optionally refresh email logs or show success message
        }}
      />
    </div>
  );
}
