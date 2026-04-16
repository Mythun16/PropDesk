import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

export default function LastPageTracker() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const lastTrackedPathRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (user.is_new_user === true || user.role === 'guest') return;

    const path = location.pathname;
    if (!path.startsWith('/agent') && !path.startsWith('/admin')) return;

    // Avoid spamming the backend on re-renders.
    if (lastTrackedPathRef.current === path) return;
    lastTrackedPathRef.current = path;

    api.put('/auth/last-page', { last_page: path }).catch(() => {
      // Best-effort tracking; never block navigation.
    });
  }, [location.pathname, loading, user]);

  return null;
}

