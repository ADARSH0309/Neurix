'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Github, Linkedin, Twitter } from 'lucide-react';

interface FlipCardProps {
    data: {
        name: string;
        username: string;
        image: string;
        bio: string;
        stats: {
            following: number;
            followers: number;
            posts: number;
        };
        socialLinks: {
            linkedin: string;
            github: string;
            twitter: string;
        };
    };
    className?: string;
}

export function FlipCard({ data, className }: FlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    function handleFlip() {
        if (!isAnimating) {
            setIsFlipped(!isFlipped);
            setIsAnimating(true);
        }
    }

    return (
        <div
            className={cn(
                "group relative h-[400px] w-[300px] cursor-pointer perspective-1000",
                className
            )}
            onClick={handleFlip}
        >
            <motion.div
                className="relative h-full w-full rounded-xl shadow-xl transition-all duration-500 [transform-style:preserve-3d]"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                onAnimationComplete={() => setIsAnimating(false)}
            >
                {/* Front Face */}
                <div className="absolute inset-0 h-full w-full rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 p-6 [backface-visibility:hidden] border border-gray-200 dark:border-neutral-700 flex flex-col items-center justify-between">
                    <div className="flex flex-col items-center gap-4 mt-8">
                        <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-neutral-800 shadow-lg">
                            <img
                                src={data.image}
                                alt={data.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{data.name}</h3>
                            <p className="text-sm font-medium text-blue-500">@{data.username}</p>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-3 gap-2 py-4 border-t border-gray-100 dark:border-neutral-700">
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{data.stats.posts}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Posts</p>
                        </div>
                        <div className="text-center border-l border-r border-gray-100 dark:border-neutral-700">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{data.stats.followers}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Followers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{data.stats.following}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
                        </div>
                    </div>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 h-full w-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col items-center justify-center text-center">
                    <div className="space-y-6">
                        <h4 className="text-xl font-bold">About</h4>
                        <p className="text-blue-100 leading-relaxed">
                            {data.bio}
                        </p>

                        <div className="flex justify-center gap-4 pt-4">
                            <a
                                href={data.socialLinks.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Github className="size-5" />
                            </a>
                            <a
                                href={data.socialLinks.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Twitter className="size-5" />
                            </a>
                            <a
                                href={data.socialLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Linkedin className="size-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Demo wrapper component to match user request structure
export const FlipCardDemo = () => {
    const data = {
        name: 'Animate UI',
        username: 'animate_ui',
        image: 'https://i.pravatar.cc/150?img=68', // Using placeholder as original might break
        bio: 'A fully animated, open-source component distribution built with React, TypeScript, Tailwind CSS, and Motion.',
        stats: { following: 200, followers: 2900, posts: 120 },
        socialLinks: {
            linkedin: 'https://linkedin.com',
            github: 'https://github.com',
            twitter: 'https://twitter.com',
        },
    };

    return <FlipCard data={data} />;
};
