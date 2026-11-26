import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';


//Capabilities
type Props<T> = {
  title: string;
  description: string;
  path: string;
  collection: string;
  emptyMessage: string;
  renderItem: (item: T) => ReactNode;
};

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; items: T[] };

export function CapabilityCard<T>({
  title,
  description,
  path,
  collection,
  emptyMessage,
  renderItem,
}: Props<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });

    getJson<Record<string, T[]>>(path)
      .then((response) => {
        const items = response[collection];
        if (!Array.isArray(items)) {
          throw new Error(`Invalid ${collection} response`);
        }
        if (active) setState({ status: 'success', items });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [collection, path]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}.</p>}
        {state.status === 'success' && state.items.length === 0 && <p>{emptyMessage}</p>}
        {state.status === 'success' && state.items.length > 0 && (
          <ul className="list-group">
            {state.items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
