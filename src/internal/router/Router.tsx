import {
  JSX,
  createContext,
  useContext,
  createMemo,
  mergeProps,
  Show,
  createSignal,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import assert from '../assert';
import {
  createPage,
  matchRoute,
  Page,
  PageRouter,
  RouterParams,
  RouterResult,
} from './router-node';
import useLocation, { UseLocation, UseLocationOptions } from './use-location';

export interface RouterInstance<P extends RouterParams = RouterParams> extends UseLocation {
  params: P;
}

const LocationContext = createContext<UseLocation>();
const ParamsContext = createContext<() => RouterParams>();
const FallbackContext = createContext<() => void>();

export function useFallback() {
  const ctx = useContext(FallbackContext);
  assert(ctx != null, new Error('Missing FallbackContext'));
  return ctx;
}

const DEFAULT_PAGE: Page<any> = createPage(() => null);

DEFAULT_PAGE.getLayout = (props) => createMemo(() => props.children);

interface RouteBuilderProps {
  result: RouterResult<Page<any>>[];
}

function RouteBuilder(props: RouteBuilderProps): JSX.Element {
  const length = createMemo(() => props.result.length);
  const page = createMemo(() => props.result[0].value ?? DEFAULT_PAGE);
  const layout = createMemo(() => page().getLayout ?? DEFAULT_PAGE.getLayout);
  const params = createMemo(() => props.result[0].params);
  const rest = createMemo(() => props.result.slice(1));

  return (
    <ParamsContext.Provider value={params}>
      <Dynamic component={layout()}>
        <Show when={length() > 1} fallback={<Dynamic component={page()} />}>
          <RouteBuilder result={rest()} />
        </Show>
      </Dynamic>
    </ParamsContext.Provider>
  );
}

interface RouteBuilderRootProps {
  result: RouterResult<Page<any>>[];
  fallback?: JSX.Element;
}

function RouteBuilderRoot(props: RouteBuilderRootProps): JSX.Element {
  const hasResult = createMemo(() => props.result.length > 0);

  return (
    <Show when={hasResult()} fallback={props.fallback}>
      <RouteBuilder result={props.result} />
    </Show>
  );
}

export interface RouterProps {
  routes: PageRouter;
  fallback?: JSX.Element;
  location?: UseLocationOptions;
}

export default function Router(
  props: RouterProps,
): JSX.Element {
  const location = useLocation(() => props.routes, props.location);

  const matchedRoute = createMemo(() => {
    const route = location.pathname;
    const result = matchRoute(props.routes, route);
    return result;
  });

  const [fallback, setFallback] = createSignal(false);

  function yieldFallback() {
    setFallback(true);
  }

  createMemo(() => {
    matchedRoute();
    setFallback(false);
  });

  return (
    <LocationContext.Provider value={location}>
      <FallbackContext.Provider value={yieldFallback}>
        <Show when={!fallback()} fallback={props.fallback}>
          <RouteBuilderRoot result={matchedRoute()} />
        </Show>
      </FallbackContext.Provider>
    </LocationContext.Provider>
  );
}

export function useRouter<P extends RouterParams>(): RouterInstance<P> {
  const location = useContext(LocationContext);
  const params = useContext(ParamsContext);
  if (location) {
    return mergeProps(location, {
      params: (params ? params() : {}) as P,
    });
  }
  throw new Error('useRouter must be used in a component within <Router>');
}
