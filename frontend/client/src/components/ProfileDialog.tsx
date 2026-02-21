import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Save } from 'lucide-react';
import type { UserProfile } from '@/types';

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profile: UserProfile;
    onSave: (profile: UserProfile) => void;
}

export function ProfileDialog({ open, onOpenChange, profile, onSave }: ProfileDialogProps): React.ReactElement {
    const [name, setName] = useState(profile.name);
    const [email, setEmail] = useState(profile.email);

    useEffect(() => {
        if (open) {
            setName(profile.name);
            setEmail(profile.email);
        }
    }, [open, profile]);

    const handleSave = (): void => {
        onSave({ name: name.trim() || 'User', email: email.trim() });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-midnight border-white/5 text-white">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl text-white">Edit Profile</DialogTitle>
                    <DialogDescription className="text-slate-grey">Update your display name and email address</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Avatar preview */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-electric-purple/20 rounded-full blur-md group-hover:blur-lg transition-all" />
                            <Avatar className="h-24 w-24 border-2 border-white/10 relative">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} />
                                <AvatarFallback className="bg-gradient-to-br from-midnight to-obsidian text-electric-purple text-3xl font-heading border border-white/5">
                                    {name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Name field */}
                    <div className="space-y-2">
                        <label htmlFor="profile-name" className="text-xs font-bold text-slate-grey uppercase tracking-wider">
                            Display Name
                        </label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-grey group-focus-within:text-electric-purple transition-colors" />
                            <Input
                                id="profile-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                className="pl-10 bg-black/20 border-white/5 focus:border-electric-purple/50 focus:bg-black/40 text-white placeholder:text-slate-grey/50"
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                    </div>

                    {/* Email field */}
                    <div className="space-y-2">
                        <label htmlFor="profile-email" className="text-xs font-bold text-slate-grey uppercase tracking-wider">
                            Email Address
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-grey group-focus-within:text-electric-purple transition-colors" />
                            <Input
                                id="profile-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="pl-10 bg-black/20 border-white/5 focus:border-electric-purple/50 focus:bg-black/40 text-white placeholder:text-slate-grey/50"
                                type="email"
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-grey hover:text-white hover:bg-white/5"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-electric-purple text-white hover:bg-electric-purple/90 shadow-lg shadow-electric-purple/20"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
