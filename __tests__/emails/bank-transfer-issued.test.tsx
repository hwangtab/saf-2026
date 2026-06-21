/** @jest-environment node */
import * as ReactDOMServer from 'react-dom/server';
import { render } from '@react-email/render';
import * as React from 'react';

import BankTransferIssuedEmail from '@/emails/bank-transfer-issued';

jest.mock('@react-email/render', () => ({
  render: (element: React.ReactElement) =>
    Promise.resolve(ReactDOMServer.renderToStaticMarkup(element)),
}));

describe('BankTransferIssuedEmail', () => {
  it('renders the stored bank-transfer due date string without reparsing timezone', async () => {
    const html = await render(
      <BankTransferIssuedEmail
        buyerName="Jane"
        orderNo="SAF-EMAIL"
        artworkTitle="Spring"
        artistName="Artist"
        amount={100000}
        bankTransfer={{
          bankName: 'IBK',
          accountNumber: '301-101031-04-095',
          holderName: 'Korea Smart Cooperative',
          dueDate: '6/21/2026, 2:00:00 PM',
        }}
        locale="en"
      />
    );

    expect(html).toContain('Bank transfer deposit instructions');
    expect(html).toContain('6/21/2026, 2:00:00 PM');
    expect(html).not.toContain('Jun 21, 2026, 11:00 PM');
    expect(html).not.toContain('Virtual account');
  });
});
