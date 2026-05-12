import styles from './container.module.css';
export function Container({ as: Tag = 'div', children }) {
    return <Tag className={styles.container}>{children}</Tag>;
}
