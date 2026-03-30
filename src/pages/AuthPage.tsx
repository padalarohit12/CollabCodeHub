import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Loader2, Code2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
            const payload = isSignUp
                ? { email, password, metadata: { full_name: fullName } }
                : { email, password };

            console.log(`[Auth] Attempting ${isSignUp ? 'SignUp' : 'Login'} at ${endpoint}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(err => {
                console.error("[Auth] fetch error:", err);
                throw new Error('Connection to backend failed. Ensure the server is running on http://localhost:3001');
            });

            const data = await response.json().catch(() => {
                throw new Error('Invalid JSON response from server');
            });

            if (!response.ok) {
                console.error("[Auth] Server error response:", data);
                throw new Error(data.error || 'Authentication failed');
            }

            // Hydrate the local Supabase client with the session returned by our server
            if (data.session) {
                console.log("[Auth] Success! Refreshing session in local storage...");
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                });
                if (sessionError) {
                    console.error("[Auth] setSession error:", sessionError);
                    throw sessionError;
                }
                navigate('/dashboard');
            } else if (isSignUp) {
                // If sign up succeeded but no session (rare with auto-confirm), show message
                setError('✅ Account created! You can now Sign In.');
                setIsSignUp(false);
            }
        } catch (err: any) {
            console.error("[Auth] Caught Error:", err);
            setError(err.message === 'Failed to fetch' ? 'Failed to connect to backend server. Make sure it is running!' : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-2xl transition-all hover:shadow-primary/5">
                <div className="text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                        <Code2 size={32} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {isSignUp ? 'Create an account' : 'Welcome back'}
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        {isSignUp
                            ? 'Join the future of real-time collaboration'
                            : 'Sign in to continue to your workspace'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="mt-8 space-y-6">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 animate-in fade-in zoom-in duration-200">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none text-foreground" htmlFor="fullName">
                                    Full Name
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none text-foreground" htmlFor="email">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                placeholder="name@example.com"
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none text-foreground" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
                            loading && "cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isSignUp ? (
                            <UserPlus className="mr-2 h-4 w-4" />
                        ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                        )}
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="font-medium text-primary hover:underline underline-offset-4"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
