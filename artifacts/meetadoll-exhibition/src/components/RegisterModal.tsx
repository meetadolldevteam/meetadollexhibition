import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RegisterModal = ({ open, onOpenChange }: Props) => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSubmitted(false); }}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Register Interest</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <p className="text-muted-foreground py-4">Thank you! Your submission has been received!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input placeholder="Name" required className="bg-secondary border-border" />
            <Input placeholder="Email" type="email" required className="bg-secondary border-border" />
            <Button type="submit" className="rounded-full">Submit</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegisterModal;
