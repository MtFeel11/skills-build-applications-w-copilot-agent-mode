import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { _id?: string; title: string; reason: string };
type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    getJson<{ suggestions: WorkoutSuggestion[] }>(
      `/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`,
    )
      .then(({ suggestions }) => {
        if (!Array.isArray(suggestions)) {
          throw new Error('Invalid workout suggestions response');
        }
        if (active) setState({ status: 'success', suggestions });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
        {state.status === 'error' && <p role="alert">Unable to load workout suggestions.</p>}
        {state.status === 'success' && state.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
        {state.status === 'success' && state.suggestions.length > 0 && (
          <ul className="list-group">
            {state.suggestions.map((suggestion, index) => (
              <li className="list-group-item" key={suggestion._id ?? index}>
                <strong>{suggestion.title}</strong>: {suggestion.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
