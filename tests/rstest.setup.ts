import { afterEach, expect } from '@rstest/core';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(jestDomMatchers);

// El auto-cleanup de testing-library se engancha a un `afterEach` global que
// solo se registra con algunos runners. Sin esto, cada render se acumula en
// el mismo document y las consultas encuentran los elementos de los tests
// anteriores — que falla como si el componente estuviera duplicado.
afterEach(cleanup);
