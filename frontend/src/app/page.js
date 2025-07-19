"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getBackendUrl } from "@/utils/getBackendUrl";
import API_CONFIG from "@/config/api";

// Dynamic import for better performance
const DynamicTelegramLogin = dynamic(
  () => import("./components/TelegramLogin"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 p-3 bg-blue-600 rounded-lg text-white text-sm font-medium">
        <span className="animate-spin">🔄</span>
        Loading Login...
      </div>
    ),
  }
);

export default function Home() {
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [randomBotUsername, setRandomBotUsername] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setIsClient(true);

    const handleResize = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 768);
        setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetch(
      `${getBackendUrl()}${API_CONFIG.ENDPOINTS.botUsernames}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.usernames && data.usernames.length > 0) {
          const idx = Math.floor(Math.random() * data.usernames.length);
          setRandomBotUsername(data.usernames[idx]);
        }
      });
  }, []);

  const handleLogin = async (userData) => {
    try {
      const response = await fetch(`${getBackendUrl()}${API_CONFIG.ENDPOINTS.auth}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      if (!response.ok) throw new Error(`Backend auth failed: ${response.status}`);

      const result = await response.json();
      if (result.success && result.user) {
        const backendUser = {
          id: result.user.telegram_id,
          telegram_id: result.user.telegram_id,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          username: result.user.username,
          photo_url: result.user.photo_url,
          backend_id: result.user.id,
          storage_used: result.user.storage_used || 0,
        };

        setUser(backendUser);
        localStorage.setItem("td_user", JSON.stringify(backendUser));
        router.push("/dashboard");
      } else {
        throw new Error("Backend auth failed");
      }
    } catch (error) {
      const normalizedUser = {
        id: userData.id || userData.telegram_id,
        telegram_id: userData.id || userData.telegram_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        photo_url: userData.photo_url || null,
      };

      setUser(normalizedUser);
      localStorage.setItem("td_user", JSON.stringify(normalizedUser));
      router.push("/dashboard");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("td_user");
    localStorage.removeItem("td_token");
    localStorage.removeItem("td_session");
    window.location.reload();
  };

  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center p-12 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl">
          <div className="animate-spin text-5xl mb-4 text-blue-400">🌀</div>
          <p className="text-gray-400">Loading Telegram Drive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-800/90 backdrop-blur-lg border-b border-gray-700 py-4 shadow-lg">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-blue-400">☁️</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Telegram Drive
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors duration-200">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors duration-200">
              How It Works
            </a>
            <a href="#security" className="text-gray-400 hover:text-white transition-colors duration-200">
              Security
            </a>
            {user && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                Logout
              </button>
            )}
          </nav>

          <div className="md:hidden">
            {/* Mobile menu button would go here */}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-gray-900/30"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Your Personal Cloud Storage
              </span>
              <br />
              <span className="text-white">Powered by Telegram</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Store, manage, and access your files securely using Telegram's robust infrastructure. 
              Unlimited storage, enterprise-grade security, and completely free.
            </p>

            {!user ? (
              <div className="max-w-md mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-xl overflow-hidden transition-all hover:shadow-2xl">
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Get Started in Minutes
                    </h2>
                    <p className="text-gray-400">
                      Connect your Telegram account to unlock your personal cloud storage
                    </p>
                  </div>

                  <div className="p-6 bg-gray-800/30 border-t border-gray-700/50">
                    <div className="space-y-4">
                      <div className="flex gap-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50 transition-all hover:border-purple-500/50">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                          1
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-white">Create Private Channel</h3>
                          <p className="mt-1 text-sm text-gray-400">
                            Set up a new private Telegram channel for your files
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50 transition-all hover:border-purple-500/50">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                          2
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-white">Add Our Bot</h3>
                          <p className="mt-1 text-sm text-gray-400">
                            Make the bot an admin in your channel
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 p-4 bg-gray-800/40 rounded-lg border border-gray-700/50 transition-all hover:border-purple-500/50">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                          3
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-white">Start Uploading</h3>
                          <p className="mt-1 text-sm text-gray-400">
                            Securely store and access your files anywhere
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-700/50">
                    <div className="flex justify-center mb-4">
                      <DynamicTelegramLogin onLogin={handleLogin} />
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      Secure authentication powered by Telegram
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 text-center shadow-xl transition-all hover:shadow-2xl">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome back, {user.first_name}!
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Your personal cloud storage is ready and waiting.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/20"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-gradient-to-br from-gray-900/50 to-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why Choose Telegram Drive?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Built on Telegram's battle-tested infrastructure with features designed for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "⚡",
                title: "Lightning Fast",
                description: "Upload and download at maximum speed using Telegram's global server network",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: "🔒",
                title: "Bank-Level Security",
                description: "Military-grade encryption and Telegram's proven security infrastructure",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: "💰",
                title: "Completely Free",
                description: "No subscriptions, no hidden fees - use Telegram's infrastructure at no cost",
                color: "from-green-500 to-teal-500"
              },
              {
                icon: "📱",
                title: "Cross-Platform",
                description: "Access your files from any device - mobile, tablet, or desktop",
                color: "from-yellow-500 to-orange-500"
              },
              {
                icon: "🌐",
                title: "Global Access",
                description: "Available worldwide with Telegram's distributed server network",
                color: "from-red-500 to-pink-500"
              },
              {
                icon: "🔄",
                title: "Instant Sync",
                description: "Files are instantly available across all your connected devices",
                color: "from-indigo-500 to-purple-500"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 transition-all hover:border-purple-500/50 hover:shadow-lg"
              >
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Get started with your personal cloud storage in just 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Login with Telegram",
                description: "Securely authenticate using your existing Telegram account. No new passwords needed.",
                icon: "🔐"
              },
              {
                step: "2",
                title: "Set Up Your Channel",
                description: "Create a private channel and add our bot as admin to enable cloud storage",
                icon: "⚙️"
              },
              {
                step: "3",
                title: "Start Uploading",
                description: "Drag and drop files or browse to upload. Your files are instantly secured",
                icon: "📤"
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 relative pt-16 transition-all hover:border-purple-500/50 hover:shadow-lg"
              >
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {step.step}
                </div>
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 md:py-32 bg-gradient-to-br from-gray-900/50 to-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Your data security is our top priority
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: "🛡️",
                title: "End-to-End Encryption",
                description: "All files are encrypted before upload using industry-standard AES-256 encryption"
              },
              {
                icon: "🔑",
                title: "Zero-Knowledge Architecture",
                description: "We can't access your files. Only you have the keys to decrypt your data"
              },
              {
                icon: "🏢",
                title: "Telegram Infrastructure",
                description: "Built on Telegram's proven infrastructure used by 800+ million users worldwide"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 transition-all hover:border-purple-500/50 hover:shadow-lg"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup Guide Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Complete Setup Guide
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Follow these detailed steps to get your Telegram Drive up and running
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                title: "Create Telegram Channel",
                items: [
                  "Open Telegram app",
                  "Click 'New Channel'",
                  "Name it (e.g., 'My Drive')",
                  "Make it Private",
                  "Skip adding subscribers"
                ]
              },
              {
                step: "2",
                title: "Add Bot to Channel",
                items: [
                  "Go to your channel",
                  "Click channel name → 'Manage Channel'",
                  "Click 'Administrators'",
                  "Add the assigned bot as admin",
                  "Give it all permissions"
                ]
              },
              {
                step: "3",
                title: "Get Channel ID",
                items: [
                  "Send any message to your channel",
                  "Forward it to @userinfobot",
                  "Copy the Channel ID",
                  "Enter it in your dashboard",
                  "Start uploading files!"
                ]
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 relative pt-16 transition-all hover:border-purple-500/50 hover:shadow-lg"
              >
                <div className="absolute -top-5 left-8 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
                <ul className="space-y-3 text-gray-400">
                  {step.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto mt-16 p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 flex gap-4 items-start">
            <div className="text-2xl text-purple-400 mt-1">💡</div>
            <div className="text-gray-300">
              <strong className="text-white">Pro Tip:</strong> Your channel acts as your personal cloud storage. 
              Only you and the bot can access it. All files are stored securely in your Telegram channel 
              and can be managed through our intuitive dashboard.
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-purple-900/30 to-blue-900/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Experience the Future of Cloud Storage?
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Join thousands of users who trust Telegram Drive for their personal file storage needs
          </p>
          {!user ? (
            <div className="flex justify-center">
              <DynamicTelegramLogin onLogin={handleLogin} />
            </div>
          ) : (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:from-blue-600 hover:to-purple-600 transition-all transform hover:-translate-y-1 shadow-xl hover:shadow-blue-500/30 text-lg"
            >
              Go to Your Dashboard
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-16 pb-8 bg-gray-900/50 backdrop-blur-sm border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl text-blue-400">☁️</span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Telegram Drive
                </span>
              </div>
              <p className="text-gray-400">
                Secure cloud storage powered by Telegram's infrastructure.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>File Storage</li>
                <li>Secure Sharing</li>
                <li>Real-time Sync</li>
                <li>Mobile Access</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-4">Security</h4>
              <ul className="space-y-2 text-gray-400">
                <li>End-to-End Encryption</li>
                <li>Zero-Knowledge</li>
                <li>Telegram Auth</li>
                <li>GDPR Compliant</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>Support</li>
                <li>API Reference</li>
                <li>Community</li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Telegram Drive. Built with ❤️ using Telegram's API.
            <br />
            Not affiliated with Telegram Messenger LLP.
          </div>
        </div>
      </footer>
    </div>
  );
}