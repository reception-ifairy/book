import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { StoryScreen } from './screens/Story';
import { Admin } from './screens/Admin';

const readRoute = () => window.location.hash.replace(/^#\/?/, '').split('/');

export const navigate = (path: string) => {
  window.location.hash = `/${path}`;
};

export default function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [screen, id] = route;
  if (screen === 'admin') return <Admin />;
  if (screen === 'story' && id) return <StoryScreen key={id} storyId={id} />;
  return <Home />;
}
