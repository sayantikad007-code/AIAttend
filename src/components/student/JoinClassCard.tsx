import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Loader2, KeyRound } from 'lucide-react';

interface JoinClassCardProps {
  onJoined?: () => void;
}

export function JoinClassCard({ onJoined }: JoinClassCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Please enter a class code');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('join_class_by_code', {
        _code: code.trim().toUpperCase()
      });

      if (error) throw error;

      toast.success('Successfully joined the class!');
      setCode('');
      setIsOpen(false);
      onJoined?.();
    } catch (error: any) {
      console.error('Error joining class:', error);
      toast.error(error.message || 'Failed to join class');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Join Class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Join a Class
          </DialogTitle>
          <DialogDescription>
            Enter the class code provided by your professor to join
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classCode">Class Code</Label>
            <Input
              id="classCode"
              placeholder="e.g., ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-lg tracking-widest font-mono uppercase"
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || code.length !== 6}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Join Class
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
