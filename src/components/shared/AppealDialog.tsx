import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Camera, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: { id: string; amount: number; trigger_type: string; status: string } | null;
  onSuccess?: () => void;
}

export function AppealDialog({ open, onOpenChange, claim, onSuccess }: AppealDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 3 - files.length);
    const validFiles = selected.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'));
    
    if (validFiles.length < selected.length) {
      toast.error('Only images under 5MB are allowed');
    }

    setFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!claim || !user || !reason.trim()) return;
    
    setSubmitting(true);
    try {
      // Upload evidence photos
      const evidenceUrls: string[] = [];
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const ext = file.name.split('.').pop();
          const path = `${user.id}/${claim.id}-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('evidence').upload(path, file);
          if (error) throw error;
          const { data: signedData, error: signedErr } = await supabase.storage.from('evidence').createSignedUrl(path, 86400);
          if (signedErr || !signedData?.signedUrl) throw new Error('Failed to generate evidence URL');
          evidenceUrls.push(signedData.signedUrl);
        }
        setUploading(false);
      }

      // Submit appeal via edge function
      const { data, error } = await supabase.functions.invoke('submit-appeal', {
        body: { claim_id: claim.id, reason: reason.trim(), evidence_urls: evidenceUrls },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to submit appeal');
      }

      toast.success('Appeal submitted!', {
        description: 'Your appeal is now under review.',
        icon: '📨',
      });
      
      setReason('');
      setFiles([]);
      setPreviews([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Appeal Claim</DialogTitle>
          <DialogDescription>
            Submit evidence and explain why this claim should be reconsidered.
          </DialogDescription>
        </DialogHeader>

        {claim && (
          <div className="space-y-4">
            {/* Claim Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{claim.trigger_type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">Claim #{claim.id.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold">₹{Number(claim.amount).toLocaleString()}</p>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                  {claim.status}
                </Badge>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Appeal</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you believe this claim was incorrectly flagged/rejected..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
            </div>

            {/* Photo Evidence */}
            <div className="space-y-2">
              <Label>Photo Evidence (optional, max 3)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {files.length < 3 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px]">Add Photo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!reason.trim() || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading evidence...' : 'Submitting appeal...'}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Submit Appeal
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
