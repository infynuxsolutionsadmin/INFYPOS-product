import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import OpenShiftPage from '../pages/OpenShiftPage';
import POSPage from '../pages/POSPage';
import { RequireAuth, RequireShift } from './guards';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated routes */}
      <Route element={<RequireAuth />}>
        <Route path="/open-shift" element={<OpenShiftPage />} />

        {/* Routes that also require an open shift */}
        <Route element={<RequireShift />}>
          <Route path="/pos" element={<POSPage />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
