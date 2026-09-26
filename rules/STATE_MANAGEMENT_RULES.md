# State Management Rules

Use the smallest state scope that solves the problem:
1. local component state
2. URL/search params
3. server state
4. feature state
5. global state

Do not create global state for convenience. Do not duplicate server state without a clear synchronization strategy.
