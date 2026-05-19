'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronRight, ScanLine, Wallet, Target, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut' as const,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.15,
      ease: 'easeOut' as const,
    },
  }),
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const [isMounted, setIsMounted] = useState(false)

  const yHero = useTransform(scrollY, [0, 300], [0, 100])
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0.5])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleGetStarted = () => {
    navigate('/login')
  }

  if (!isMounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] via-[#0f1f3d] to-[#0b1120] text-white font-sans overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-gradient-to-br from-[#10b981] via-[#059669] to-transparent opacity-20 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-tl from-[#10b981] via-transparent to-transparent opacity-10 blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Navbar */}
      <motion.nav
        className="fixed top-0 w-full z-50 backdrop-blur-md bg-[#0b1120]/40"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <motion.div
            className="text-2xl font-bold text-white tracking-tight"
            whileHover={{ scale: 1.05 }}
          >
            Finman
          </motion.div>
          <div className="flex gap-4">
            <motion.button
              onClick={() => navigate('/login')}
              className="px-6 py-2 text-white font-medium hover:text-[#10b981] transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In
            </motion.button>
            <motion.button
              onClick={handleGetStarted}
              className="px-6 py-2 bg-[#10b981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors shadow-lg shadow-[#10b981]/50"
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.8)' }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ y: yHero, opacity: opacityHero }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="mb-6 inline-block"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="px-4 py-2 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 backdrop-blur-sm flex items-center gap-2 w-fit mx-auto">
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              <span className="text-sm font-medium text-[#94a3b8]">
                Transform Your Financial Future
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.span
              className="block text-white"
              variants={itemVariants}
            >
              Manage Wealth,
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-[#10b981] via-[#34d399] to-[#6ee7b7] bg-clip-text text-transparent"
              variants={itemVariants}
            >
              Empower Your Life
            </motion.span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-[#94a3b8] max-w-2xl mx-auto mb-8"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            Streamline your personal finance, track expenses with AI receipt scanning, and achieve your saving goals effortlessly.
          </motion.p>

          <motion.button
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#10b981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-all shadow-2xl shadow-[#10b981]/50"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.4 }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            Get Started
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.section>

      {/* Features Grid Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-[#94a3b8]">
              Everything you need to master your personal finances
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {/* Card 1: AI Receipt Scan */}
            <motion.div
              custom={0}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl p-8 backdrop-blur-xl bg-white/3 border border-white/5 hover:border-[#10b981]/50 transition-all duration-300"
              whileHover={{
                y: -10,
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.1)',
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent" />
              </div>

              <div className="relative z-10">
                <motion.div
                  className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#059669]/10 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  <ScanLine className="w-6 h-6 text-[#10b981]" />
                </motion.div>

                <h3 className="text-xl font-bold mb-3">AI Receipt Scan</h3>
                <p className="text-[#94a3b8]">
                  Snap your receipts and let AI categorize your expenses in real-time.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Smart Wallets */}
            <motion.div
              custom={1}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl p-8 backdrop-blur-xl bg-white/3 border border-white/5 hover:border-[#10b981]/50 transition-all duration-300"
              whileHover={{
                y: -10,
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.1)',
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent" />
              </div>

              <div className="relative z-10">
                <motion.div
                  className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#059669]/10 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  <Wallet className="w-6 h-6 text-[#10b981]" />
                </motion.div>

                <h3 className="text-xl font-bold mb-3">Smart Wallets</h3>
                <p className="text-[#94a3b8]">
                  Manage multiple accounts, track liquidity, and monitor your cash flow.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Goal Planning */}
            <motion.div
              custom={2}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl p-8 backdrop-blur-xl bg-white/3 border border-white/5 hover:border-[#10b981]/50 transition-all duration-300"
              whileHover={{
                y: -10,
                boxShadow: '0 20px 40px rgba(16, 185, 129, 0.1)',
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-[#10b981]/10 to-transparent" />
              </div>

              <div className="relative z-10">
                <motion.div
                  className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#059669]/10 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                >
                  <Target className="w-6 h-6 text-[#10b981]" />
                </motion.div>

                <h3 className="text-xl font-bold mb-3">Goal Planning</h3>
                <p className="text-[#94a3b8]">
                  Set savings milestones and get actionable insights to reach them faster.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats/Trust Banner */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="rounded-3xl border border-[#10b981]/20 bg-gradient-to-br from-white/5 via-white/3 to-transparent backdrop-blur-xl p-8 sm:p-12"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-[#10b981] mb-2">
                  AI-Powered
                </div>
                <p className="text-[#94a3b8]">Expense Tracking</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-[#10b981] mb-2">
                  100%
                </div>
                <p className="text-[#94a3b8]">Data Privacy</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-[#10b981] mb-2">
                  24/7
                </div>
                <p className="text-[#94a3b8]">Financial Insights</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Ready to Transform Your Finances?
            </h2>
            <p className="text-lg text-[#94a3b8] mb-8">
              Join thousands of users managing their wealth with confidence
            </p>

            <motion.button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#10b981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-all shadow-2xl shadow-[#10b981]/50"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)',
              }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started Today
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 mt-20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-[#64748b]">
          <p>&copy; 2024 Finman. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
