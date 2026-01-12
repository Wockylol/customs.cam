import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Users,
  Building2,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  MessageSquare,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  ChevronRight,
  Brain,
  Target,
  Rocket,
  Heart,
  Globe,
  Lock,
  Bell,
  FileText,
  PieChart,
  Layers,
  Activity
} from 'lucide-react';

// Animated counter component
const AnimatedCounter: React.FC<{ end: number; suffix?: string; prefix?: string; duration?: number }> = ({ 
  end, 
  suffix = '', 
  prefix = '',
  duration = 2 
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let startTime: number;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// Section wrapper with scroll reveal
const RevealSection: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ 
  children, 
  className = '',
  delay = 0 
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't render (navigate will redirect)
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Smart recommendations and idiolect analysis help your team communicate authentically with every client.',
      color: 'from-violet-500 to-purple-600',
      size: 'large'
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track revenue, performance, and team metrics with live dashboards.',
      color: 'from-cyan-500 to-blue-600',
      size: 'medium'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Shifts, roles, permissions, and payroll in one place.',
      color: 'from-emerald-500 to-teal-600',
      size: 'medium'
    },
    {
      icon: MessageSquare,
      title: 'Client Communication',
      description: 'Unified inbox with SMS, in-app messaging, and smart notifications.',
      color: 'from-pink-500 to-rose-600',
      size: 'small'
    },
    {
      icon: Layers,
      title: 'Custom Workflows',
      description: 'From request to delivery with approval pipelines.',
      color: 'from-amber-500 to-orange-600',
      size: 'small'
    },
    {
      icon: Globe,
      title: 'Multi-Platform',
      description: 'Manage all creator platforms from one dashboard.',
      color: 'from-indigo-500 to-violet-600',
      size: 'small'
    }
  ];

  const pillars = [
    {
      icon: Building2,
      title: 'For Agency Owners',
      subtitle: 'Scale with confidence',
      benefits: [
        'Complete oversight of all operations',
        'Revenue tracking and financial reports',
        'Team performance analytics',
        'Multi-agency management',
        'Custom role permissions'
      ],
      gradient: 'from-violet-600 to-purple-700',
      glow: 'glow-violet'
    },
    {
      icon: Users,
      title: 'For Teams',
      subtitle: 'Work smarter, not harder',
      benefits: [
        'AI-assisted client communication',
        'Smart task prioritization',
        'Shift and attendance tracking',
        'Real-time collaboration',
        'Performance insights'
      ],
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'glow-cyan'
    },
    {
      icon: Heart,
      title: 'For Clients',
      subtitle: 'Premium experience',
      benefits: [
        'Personalized content portal',
        'Real-time order tracking',
        'Direct communication channel',
        'Birthday surprises & perks',
        'Seamless payment flow'
      ],
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'glow-emerald'
    }
  ];

  const stats = [
    { value: 50000, suffix: '+', label: 'Clients Managed' },
    { value: 2, prefix: '$', suffix: 'M+', label: 'Revenue Tracked' },
    { value: 99, suffix: '%', label: 'Client Retention' },
    { value: 500, suffix: '+', label: 'Active Agencies' }
  ];

  const testimonials = [
    {
      quote: "This platform transformed how we manage our agency. Client retention went up 40% in the first month.",
      author: "Sarah M.",
      role: "Agency Owner",
      avatar: "SM"
    },
    {
      quote: "The AI insights are incredible. It's like having a data scientist on the team 24/7.",
      author: "Marcus K.",
      role: "Operations Manager", 
      avatar: "MK"
    },
    {
      quote: "Finally, a platform that understands our industry. The workflow automation saves us hours every day.",
      author: "Jessica L.",
      role: "Team Lead",
      avatar: "JL"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-body overflow-x-hidden">
      {/* Noise texture overlay */}
      <div className="noise-overlay fixed inset-0 z-50 pointer-events-none" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 landing-glass">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://fqfhjnpfrogjgyuniuhx.supabase.co/storage/v1/object/public/media/images/allogo.png" 
                alt="AgencyLab Logo" 
                className="h-10 w-auto"
              />
              <span className="font-display font-bold text-xl">AgencyLab</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#solutions" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Solutions</a>
              <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Testimonials</a>
            </div>

            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="btn-shimmer px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all duration-300 hidden sm:block"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="landing-orb absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-violet-600/30" />
          <div className="landing-orb-small absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-cyan-500/20" />
          <div className="landing-orb absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-purple-600/25" />
          <div className="landing-orb-small absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-emerald-500/15" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full landing-glass-light mb-8"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-slate-300">AI-Powered Agency Management</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] mb-6"
          >
            <span className="block">The Operating System</span>
            <span className="block animate-gradient-text bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400">
              for Creator Agencies
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-10"
          >
            Unify your team, delight your clients, and scale your revenue with the all-in-one platform 
            built for modern content agencies. Powered by AI. Designed for growth.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="btn-shimmer group px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-lg hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="group px-8 py-4 rounded-full landing-glass-light text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </motion.div>

          {/* Floating UI cards */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative mt-20 max-w-5xl mx-auto"
          >
            {/* Main dashboard preview */}
            <div className="relative landing-glass rounded-2xl p-1 shadow-2xl shadow-violet-500/10">
              <div className="rounded-xl bg-slate-900/80 p-6 sm:p-8">
                {/* Mock dashboard header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs text-slate-500">Dashboard Overview</div>
                </div>
                
                {/* Mock stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Active Clients', value: '1,247', icon: Users, color: 'text-violet-400' },
                    { label: 'Revenue', value: '$48.2K', icon: DollarSign, color: 'text-emerald-400' },
                    { label: 'Pending', value: '23', icon: Clock, color: 'text-amber-400' },
                    { label: 'Completed', value: '156', icon: CheckCircle, color: 'text-cyan-400' }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        <span className="text-xs text-slate-400">{stat.label}</span>
                      </div>
                      <div className="text-xl font-bold font-display">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Mock activity feed */}
                <div className="space-y-3">
                  {[
                    { text: 'New custom request from @creator_jane', time: '2m ago', type: 'new' },
                    { text: 'Payment received - $150.00', time: '15m ago', type: 'success' },
                    { text: 'Team member clocked in', time: '1h ago', type: 'info' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          item.type === 'new' ? 'bg-violet-400' :
                          item.type === 'success' ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`} />
                        <span className="text-sm text-slate-300">{item.text}</span>
                      </div>
                      <span className="text-xs text-slate-500">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating side cards */}
            <div className="hidden lg:block absolute -left-16 top-1/4 animate-landing-float">
              <div className="landing-glass rounded-xl p-4 w-48 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">Revenue</span>
                </div>
                <div className="text-2xl font-bold font-display text-emerald-400">+27%</div>
                <div className="text-xs text-slate-400">vs last month</div>
              </div>
            </div>

            <div className="hidden lg:block absolute -right-12 top-1/3 animate-landing-float-delayed">
              <div className="landing-glass rounded-xl p-4 w-52 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">AI Suggestion</span>
                </div>
                <div className="text-sm text-slate-300">Client prefers casual tone. Response drafted.</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <RevealSection key={index} delay={index * 0.1} className="text-center">
                <div className="text-4xl sm:text-5xl font-display font-bold text-white mb-2">
                  <AnimatedCounter 
                    end={stat.value} 
                    suffix={stat.suffix} 
                    prefix={stat.prefix}
                    duration={2}
                  />
                </div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section id="solutions" className="relative py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <RevealSection className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">
              Built for Everyone in Your Agency
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Whether you're the owner, a team member, or a client — we've designed every experience 
              to feel seamless and powerful.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {pillars.map((pillar, index) => (
              <RevealSection key={index} delay={index * 0.15}>
                <div className={`landing-card-hover landing-glass rounded-2xl p-8 h-full`}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center mb-6 feature-icon-glow`}>
                    <pillar.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="font-display font-bold text-xl mb-2">{pillar.title}</h3>
                  <p className="text-slate-400 text-sm mb-6">{pillar.subtitle}</p>
                  
                  <ul className="space-y-3">
                    {pillar.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="relative py-24 sm:py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <RevealSection className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">
              Everything You Need to Dominate
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From AI-powered insights to seamless workflows — all the tools your agency needs, 
              unified in one powerful platform.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <RevealSection 
                key={index} 
                delay={index * 0.1}
                className={feature.size === 'large' ? 'md:col-span-2 lg:col-span-1 lg:row-span-2' : ''}
              >
                <div className={`bento-item landing-card-hover landing-glass rounded-2xl p-8 h-full ${
                  feature.size === 'large' ? 'min-h-[300px]' : ''
                }`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 feature-icon-glow`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="font-display font-bold text-xl mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>

                  {feature.size === 'large' && (
                    <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center gap-3 mb-3">
                        <Brain className="w-5 h-5 text-violet-400" />
                        <span className="text-sm font-medium">AI Analysis Active</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Tone Match</span>
                          <span className="text-emerald-400">98%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full w-[98%] rounded-full bg-gradient-to-r from-violet-500 to-emerald-500" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-violet-600/10 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <RevealSection>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full landing-glass-light mb-6">
                <Sparkles className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-slate-300">AI-Powered Platform</span>
              </div>
              
              <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6">
                Intelligence That Works{' '}
                <span className="animate-gradient-text bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400">
                  For You
                </span>
              </h2>
              
              <p className="text-slate-400 text-lg mb-8">
                Our AI doesn't just analyze — it learns your clients, understands their preferences, 
                and helps your team communicate with authentic voice every time.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Brain, title: 'Idiolect Analysis', desc: 'Learn each client\'s unique communication style' },
                  { icon: Target, title: 'Smart Prioritization', desc: 'AI-ranked tasks based on urgency and value' },
                  { icon: Bell, title: 'Intelligent Notifications', desc: 'Right alerts, right people, right time' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl landing-glass">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="relative">
                {/* AI visualization card */}
                <div className="landing-glass rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-transparent rounded-bl-full" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">AI Assistant</div>
                        <div className="text-sm text-emerald-400">Active & Learning</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-sm text-slate-400 mb-2">Client Insight</div>
                        <div className="text-sm">
                          <span className="text-violet-400">@jessica_model</span> prefers morning messages 
                          with casual, friendly tone. Response rate: <span className="text-emerald-400">94%</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-sm text-slate-400 mb-2">Suggested Response</div>
                        <div className="text-sm text-slate-300 italic">
                          "Hey babe! Just saw your request come through 💕 I'd love to work on this for you..."
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button className="px-3 py-1.5 rounded-lg bg-violet-600 text-xs font-medium hover:bg-violet-500 transition-colors">
                            Use Suggestion
                          </button>
                          <button className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs font-medium hover:bg-slate-600 transition-colors">
                            Edit
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-emerald-400">Retention Score</span>
                        </div>
                        <span className="font-bold text-emerald-400">+23%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-24 sm:py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <RevealSection className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              See why top agencies are switching to our platform for their operations.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <RevealSection key={index} delay={index * 0.1}>
                <div className="testimonial-card rounded-2xl p-8 h-full">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  
                  <blockquote className="text-slate-300 mb-6">
                    "{testimonial.quote}"
                  </blockquote>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Client Retention Stats */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <RevealSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full landing-glass-light mb-8">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">The Data Speaks</span>
            </div>
            
            <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl mb-6">
              Client Retention{' '}
              <span className="animate-gradient-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Skyrockets
              </span>
            </h2>
            
            <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto">
              When your team has the data, insights, and organization they need — 
              clients notice the difference. And they stay.
            </p>

            <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-5xl font-display font-bold text-emerald-400 mb-2">3x</div>
                <div className="text-slate-400">Faster Response Times</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-display font-bold text-cyan-400 mb-2">47%</div>
                <div className="text-slate-400">Higher Retention</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-display font-bold text-violet-400 mb-2">2.4x</div>
                <div className="text-slate-400">Revenue Per Client</div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <RevealSection>
            <div className="relative rounded-3xl overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')] opacity-10" />
              
              <div className="relative z-10 p-12 sm:p-16 text-center">
                <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl mb-6">
                  Ready to Transform Your Agency?
                </h2>
                <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
                  Join hundreds of agencies already using our platform to scale their operations 
                  and deliver exceptional client experiences.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/login"
                    className="btn-shimmer group px-8 py-4 rounded-full bg-white text-slate-900 font-semibold text-lg hover:shadow-xl hover:shadow-black/20 transition-all duration-300 flex items-center gap-2"
                  >
                    Start Your Free Trial
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <button className="px-8 py-4 rounded-full border-2 border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition-all duration-300">
                    Schedule Demo
                  </button>
                </div>
                
                <p className="mt-6 text-white/60 text-sm">
                  No credit card required · 14-day free trial · Cancel anytime
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="https://fqfhjnpfrogjgyuniuhx.supabase.co/storage/v1/object/public/media/images/allogo.png" 
                  alt="AgencyLab Logo" 
                  className="h-10 w-auto"
                />
                <span className="font-display font-bold text-xl">AgencyLab</span>
              </div>
              <p className="text-slate-400 text-sm">
                The all-in-one platform for modern content agencies.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 AgencyLab. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

