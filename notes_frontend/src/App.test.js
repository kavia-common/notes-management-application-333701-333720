import { render, screen } from '@testing-library/react';
import App from './App';

test('renders notes app heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /notes/i });
  expect(heading).toBeInTheDocument();
});
