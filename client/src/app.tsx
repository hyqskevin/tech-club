import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';

const PostListPage = lazy(() => import('./pages/PostListPage/PostListPage'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage/CreatePostPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage/PostDetailPage'));
const CreateActivityPage = lazy(() => import('./pages/CreateActivityPage/CreateActivityPage'));
const ActivityManagePage = lazy(() => import('./pages/ActivityManagePage/ActivityManagePage'));
const ActivityDetailPage = lazy(() => import('./pages/ActivityDetailPage/ActivityDetailPage'));
const ContactPage = lazy(() => import('./pages/ContactPage/ContactPage'));

const RoutesComponent = () => {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PostListPage />} />
          <Route path="/new" element={<CreatePostPage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/create-activity" element={<CreateActivityPage />} />
          <Route path="/activity-manage" element={<ActivityManagePage />} />
          <Route path="/activity/:id" element={<ActivityDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default RoutesComponent;
