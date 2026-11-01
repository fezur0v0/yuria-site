import styles from './admin-loading.module.css';

export default function AdminLoading() {
  return <div className={styles.loading} role="status" aria-live="polite"><span>Loading...</span></div>;
}
