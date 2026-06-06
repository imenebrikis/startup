import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// style prop receives flex/sizing from the parent row (e.g. { flex: 1 })
export default function SocialButton({ style = {} }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '13px',
        borderRadius: '12px',
        border: copied ? '1.5px solid #ADEBB3' : '1.5px solid #e5e7eb',
        background: copied ? '#ADEBB3' : '#ffffff',
        color: copied ? '#0A3D3D' : '#717182',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        transition: 'background 0.18s, border-color 0.18s, color 0.18s',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Check style={{ width: '17px', height: '17px', flexShrink: 0 }} />
            {t('listingDetail.linkCopied')}
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Share2 style={{ width: '17px', height: '17px', flexShrink: 0 }} />
            {t('listingDetail.copyLink')}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
