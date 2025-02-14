import React from 'react';
import { FormattedMessage } from 'react-intl';

import ClearFilters from '../clearFilters';
import { createComponentWithIntl } from '../../../utils/testWithIntl';

describe('ClearFilters basic properties', () => {
  const element = createComponentWithIntl(<ClearFilters url="/explore" />);
  const testInstance = element.root;
  it('is a link and point to the correct place', () => {
    expect(testInstance.findByType('a').props.href).toBe('/explore');
    expect(testInstance.findByType('a').children[0].props.id).toBe('project.nav.clearFilters');
  });
  it('has a FormattedMessage children with the correct id', () => {
    expect(testInstance.findByType('a').children[0].type).toBe(FormattedMessage);
    expect(testInstance.findByType('a').children[0].props.id).toBe('project.nav.clearFilters');
  });
  it('has the correct className', () => {
    expect(testInstance.findByType('a').props.className).toBe('primary link ph3 pv2 f6 ');
    const element2 = createComponentWithIntl(<ClearFilters url="/explore" className="dib mt2" />);
    const testInstance2 = element2.root;
    expect(testInstance2.findByType('a').props.className).toBe('primary link ph3 pv2 f6 dib mt2');
  });
});
