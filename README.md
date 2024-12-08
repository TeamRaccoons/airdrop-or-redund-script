# Refund / Airdrop Script

This script is used to send SPL tokens based on a CSV file.

To install dependencies:

```bash
bun install
```

To start refund process:

1. Create csv file `csv/refund.csv` with the following columns: user, mint, rawAmount, txHash, status
2. Run refund script `bun run refund`
3. Run check script `bun run check`
