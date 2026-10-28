import { forwardRef, useId } from 'react'
import { motion } from 'framer-motion'
import { springButton, springToggle } from '../lib/motion'

const cx = (...c) => c.filter(Boolean).join(' ')
export { cx }

// The Eternal Maps mark — a pin holding Eternal's "e". Drawn as one evenodd path so it takes currentColor.
export const MARK_PATH =
  'M1000 275A525 525 0 0 1 1525 800C1525 1150 1305 1450 1085 1658Q1000 1738 915 1658C695 1450 475 1150 475 800A525 525 0 0 1 1000 275ZM1000 395A410 410 0 1 0 1000 1215A410 410 0 1 0 1000 395ZM1283 801A283 283 0 1 0 1282 834C1266 902 1196 990 1057 1022C1006 1030 971 1010 958 993C941 975 936 930 963 894C1006 840 1096 806 1196 802ZM818 788C836 690 916 621 1005 621C1071 621 1126 650 1163 704C1046 685 916 700 818 788Z'

export function Mark({ className = 'h-5 w-5', title }) {
  return (
    <svg viewBox="440 250 1120 1500" className={className} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path fill="currentColor" fillRule="evenodd" d={MARK_PATH} />
    </svg>
  )
}

// App icon — identical construction to Universal Planner's, with the Maps mark.
export function AppIcon({ size = 64, className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 2000 2000" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`g${id}`} cx="50%" cy="58%" r="62%">
          <stop offset="0" stopColor="#2F6BFF" stopOpacity=".55" />
          <stop offset=".55" stopColor="#FF4FA3" stopOpacity=".22" />
          <stop offset="1" stopColor="#FF4FA3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".14" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="2000" height="2000" rx="450" fill="#0A0A0A" />
      <rect width="2000" height="2000" rx="450" fill={`url(#g${id})`} />
      <rect width="2000" height="2000" rx="450" fill={`url(#s${id})`} />
      <g transform="translate(1000 1000) scale(.64) translate(-1000 -995)">
        <path fill="#FFFFFF" fillRule="evenodd" d={MARK_PATH} />
      </g>
    </svg>
  )
}

export const Glass = forwardRef(function Glass({ as: As = 'div', strong, className, children, ...rest }, ref) {
  return (
    <As ref={ref} className={cx(strong ? 'glass-strong' : 'glass', className)} {...rest}>
      {children}
    </As>
  )
})

export const IconButton = forwardRef(function IconButton({ label, children, className, active, ...rest }, ref) {
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={springButton}
      className={cx(
        'tap inline-flex items-center justify-center rounded-[14px] transition-colors duration-200 ease-calm',
        active ? 'bg-fg text-bg' : 'text-fg/80 hover:bg-fg/[.06] hover:text-fg',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  )
})

export const Button = forwardRef(function Button({ variant = 'secondary', size = 'md', className, children, icon: Icon, ...rest }, ref) {
  const base = 'tap inline-flex select-none items-center justify-center gap-2 font-medium transition-[background,box-shadow,opacity] duration-200 ease-calm disabled:opacity-40 disabled:pointer-events-none'
  const sizes = { sm: 'h-11 px-4 text-[14px] rounded-[14px]', md: 'h-12 px-5 text-[15px] rounded-[16px]', lg: 'h-14 px-6 text-[16px] rounded-[18px]' }
  const variants = {
    primary: 'brand-fill shadow-[0_8px_24px_-8px_rgb(47_107_255/.55)] hover:shadow-[0_10px_28px_-8px_rgb(255_79_163/.55)]',
    secondary: 'tile text-fg hover:bg-fg/[.07]',
    ghost: 'text-fg/80 hover:bg-fg/[.06] hover:text-fg',
    danger: 'tile text-fg hover:bg-fg/[.08]',
  }
  return (
    <motion.button ref={ref} type="button" whileTap={{ scale: 0.97 }} transition={springButton} className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />}
      {children}
    </motion.button>
  )
})

// Segmented control — the active segment carries the brand gradient, sliding between options.
export function Segmented({ value, onChange, options, label, size = 'md', className }) {
  const group = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cx('tile flex rounded-[16px] p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              const i = options.findIndex((x) => x.value === value)
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onChange(options[(i + 1) % options.length].value) }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onChange(options[(i - 1 + options.length) % options.length].value) }
            }}
            tabIndex={active ? 0 : -1}
            className={cx(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-[12px] font-medium transition-colors duration-200',
              size === 'sm' ? 'h-9 text-[13px]' : 'min-h-[40px] text-[14px]',
              active ? 'text-white' : 'text-fg/65 hover:text-fg',
            )}
          >
            {active && <motion.span layoutId={`seg-${group}`} transition={springToggle} className="brand-fill absolute inset-0 rounded-[12px] shadow-[0_4px_14px_-6px_rgb(47_107_255/.6)]" />}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4" strokeWidth={2.1} aria-hidden />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="tap flex w-full items-center justify-between gap-4 rounded-[16px] px-1 py-2 text-left">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-[13px] text-fg/55">{description}</span>}
      </span>
      <span className={cx('relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200', checked ? 'brand-fill' : 'bg-fg/[.12]')}>
        <motion.span layout transition={springToggle} className={cx('absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(10_10_10/.25)]', checked ? 'right-[3px]' : 'left-[3px]')} />
      </span>
    </button>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1 first:mt-1">
      <h3 className="text-[13px] font-semibold uppercase tracking-[.06em] text-fg/45">{children}</h3>
      {action}
    </div>
  )
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <div className="tile mb-4 flex h-14 w-14 items-center justify-center rounded-[20px]">
          <Icon className="h-6 w-6 text-fg/60" strokeWidth={1.8} aria-hidden />
        </div>
      )}
      <p className="text-[16px] font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-[280px] text-[14px] leading-relaxed text-fg/55">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// A tappable row used across lists (search results, saved places, recents).
export function Row({ leading, title, subtitle, trailing, onClick, className, ...rest }) {
  const Comp = onClick ? motion.button : 'div'
  const motionProps = onClick ? { whileTap: { scale: 0.985 }, transition: springButton, type: 'button', onClick } : {}
  return (
    <Comp className={cx('tap flex w-full items-center gap-3 rounded-[18px] px-2.5 py-2 text-left transition-colors duration-200', onClick && 'hover:bg-fg/[.05]', className)} {...motionProps} {...rest}>
      {leading && <div className="tile flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[18px]">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{title}</div>
        {subtitle && <div className="truncate text-[13px] text-fg/55">{subtitle}</div>}
      </div>
      {trailing}
    </Comp>
  )
}

export function Input({ className, icon: Icon, ...rest }) {
  return (
    <label className={cx('tile flex h-12 items-center gap-2 rounded-[16px] px-3.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--blue)]', className)}>
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-fg/45" aria-hidden />}
      <input className="min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none" {...rest} />
    </label>
  )
}
