import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { StoryScreen } from './screens/Story';
import { Admin } from './screens/Admin';
import { ToastProvider } from './ui';

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/');

export const navigate = (path: string) => {
  window.location.hash = `/${path}`;
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [screen, id] = route;
  return (
    <ToastProvider>
      {screen === 'admin' ? <Admin /> : screen === 'story' && id ? <StoryScreen key={id} storyId={id} /> : <Home />}
    </ToastProvider>
  );
}
