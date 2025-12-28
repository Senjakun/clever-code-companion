import { motion } from 'framer-motion';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreditBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditBlockModal({ open, onOpenChange }: CreditBlockModalProps) {
  const handleContactTelegram = () => {
    window.open('https://t.me/your_telegram_handle', '_blank');
  };

  const handleContactWhatsApp = () => {
    window.open('https://wa.me/your_whatsapp_number', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Out of Credits</DialogTitle>
            <DialogDescription className="mt-2">
              Your credit balance is $0. To continue using the AI features, please contact the owner to top up your account.
            </DialogDescription>
          </motion.div>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleContactTelegram} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Contact on Telegram
          </Button>
          <Button onClick={handleContactWhatsApp} variant="outline" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Contact on WhatsApp
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Credits are required to use AI-powered code generation features.
        </p>
      </DialogContent>
    </Dialog>
  );
}