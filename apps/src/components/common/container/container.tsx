import { createElement, type ReactNode } from 'react';

import styles from './container.module.css';

interface ContainerProps {
  as?: keyof React.JSX.IntrinsicElements;
  children: ReactNode;
}

export function Container({ as: Tag = 'div', children }: ContainerProps) {
  return createElement(Tag, { className: styles.container }, children);
}
