import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ApiBrowserPage, LegacyBrowseRedirect, LegacySdkRedirect } from './pages/ApiBrowserPage'
import { HOME_PATH, LEGACY_BROWSE_PATH } from './utils/apiRoutes'

export default function App() {
  return (
    <Routes>
      <Route path={HOME_PATH} element={<HomePage />} />
      <Route path="/sdk/:productId/:versionId/browse" element={<ApiBrowserPage />} />
      <Route path="/sdk/:sdkId/browse" element={<LegacySdkRedirect />} />
      <Route path={LEGACY_BROWSE_PATH} element={<LegacyBrowseRedirect />} />
      <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
    </Routes>
  )
}
