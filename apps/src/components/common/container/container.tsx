import type { ElementType, ReactNode } from 'react';

import styles from './container.module.css';

interface ContainerProps {
  as?: ElementType;
  children: ReactNode;
}

export function Container({ as: Tag = 'div', children }: ContainerProps) {
  return <Tag className={styles.container}>{children}</Tag>;
}
