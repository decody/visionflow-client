import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';

import styles from './button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type ButtonSize = 'l' | 'm' | 's';

interface ButtonProps {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  leftIcon?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  rightIcon?: ReactNode;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
}

export function Button({
  children,
  disabled = false,
  href,
  leftIcon,
  onClick,
  rightIcon,
  size = 'm',
  type = 'button',
  variant = 'primary',
}: ButtonProps) {
  const className = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {leftIcon ? <span className={styles.icon}>{leftIcon}</span> : null}
      <span className={styles.label}>{children}</span>
      {rightIcon ? <span className={styles.icon}>{rightIcon}</span> : null}
    </>
  );

  if (href && !disabled) {
    return (
      <Link className={className} href={href} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} disabled={disabled} onClick={onClick} type={type}>
      {content}
    </button>
  );
}
