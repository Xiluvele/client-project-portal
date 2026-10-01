import { cx } from '../../lib/format'

export function Button({ variant = 'primary', size, block, className, type = 'button', children, ...props }) {
  return (
    <button type={type} className={cx('btn', `btn--${variant}`, size === 'small' && 'btn--small', block && 'btn--block', className)} {...props}>
      {children}
    </button>
  )
}
