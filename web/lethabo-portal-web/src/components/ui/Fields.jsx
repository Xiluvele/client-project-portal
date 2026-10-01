import { cx } from '../../lib/format'
import { Icon } from './Icon'

export function TextField({ label, error, ...props }) {
  const id = props.id || props.name
  return (
    <label className="field" htmlFor={id}>
      {label ? <span className="field__label">{label}</span> : null}
      <input id={id} aria-invalid={error ? true : undefined} className={cx('field__control', error && 'field__control--invalid')} {...props} />
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  )
}

export function SelectField({ label, error, children, ...props }) {
  const id = props.id || props.name
  return (
    <label className="field" htmlFor={id}>
      {label ? <span className="field__label">{label}</span> : null}
      <select id={id} aria-invalid={error ? true : undefined} className={cx('field__control', error && 'field__control--invalid')} {...props}>{children}</select>
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  )
}

export function SearchField({ value, onChange, placeholder }) {
  return (
    <label className="search-wrap">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" />
      <input className="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}
