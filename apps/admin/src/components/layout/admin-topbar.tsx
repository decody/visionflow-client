'use client';

import { Bell, Plus, Search } from 'lucide-react';

import styles from './admin-shell.module.css';

export function AdminTopbar() {
  return (
    <header className={styles.topbar}>
      <label className={styles.search}>
        <Search aria-hidden="true" className={styles.searchIcon} size={16} />
        <input
          className={styles.searchInput}
          name="global-search"
          placeholder="문의, 사용자, 콘텐츠 검색..."
          type="search"
        />
      </label>

      <div className={styles.topActions}>
        <button aria-label="알림" className={styles.notifButton} type="button">
          <Bell aria-hidden="true" size={18} strokeWidth={1.8} />
          <span aria-hidden="true" className={styles.notifDot} />
        </button>
        <button className={styles.writeButton} type="button">
          <Plus aria-hidden="true" size={16} strokeWidth={2.4} />
          <span>새 콘텐츠</span>
        </button>
      </div>
    </header>
  );
}
