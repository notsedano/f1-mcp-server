# Points Schema Design Considerations

This document explains the design decisions made for the points transactions schema, particularly focusing on the use of metadata vs. dedicated columns.

## Using JSONB Metadata vs. Dedicated Columns

### Approach Chosen: JSONB Metadata Field

We've chosen to store conditional fields in a JSONB metadata field rather than as dedicated columns. This includes:
- `related_user_id`
- `bet_id`
- `match_id`
- `referral_code`
- `description`

### Advantages of This Approach

1. **Schema Flexibility**: The JSONB field allows us to add new attributes without schema migrations. This is especially valuable as the system evolves and new transaction types are added.

2. **Conditional Data**: Not all transaction types need the same fields. Using JSONB avoids having many NULL values in dedicated columns that only apply to specific transaction types.

3. **Query Flexibility**: PostgreSQL provides powerful operators for querying JSONB data, allowing us to search within the metadata when needed.

4. **Storage Efficiency**: For transaction types that use few or no additional fields, we avoid allocating space for unused columns.

5. **Future-Proofing**: As business requirements change, we can easily add new metadata attributes without modifying the table structure.

### Potential Drawbacks

1. **Query Complexity**: Querying JSONB fields is slightly more complex than querying regular columns (`metadata->>'bet_id'` vs. `bet_id`).

2. **No Foreign Keys**: We lose the ability to enforce foreign key constraints on fields stored in JSONB. However, this can be handled at the application level.

3. **Indexing Overhead**: GIN indexes for JSONB can be larger and slower than B-tree indexes for regular columns, though this is mitigated by PostgreSQL's efficient JSONB implementation.

### Alternative Approaches Considered

#### 1. Dedicated Columns for All Fields

We could have kept all fields as dedicated columns in the table:

```sql
CREATE TABLE public.points_transactions (
  -- Core fields...
  related_user_id UUID REFERENCES auth.users(id),
  bet_id UUID,
  match_id UUID,
  referral_code VARCHAR(50),
  description TEXT,
  -- Other fields...
);
```

**Pros**:
- Simpler queries
- Foreign key constraints
- More efficient indexing for specific fields

**Cons**:
- Many NULL values for fields not used by all transaction types
- Schema changes required when adding new fields
- Less flexible for evolving requirements

#### 2. Separate Tables for Each Transaction Type

We could have created a core transactions table and separate tables for each transaction type:

```sql
CREATE TABLE public.points_transactions (
  -- Core fields only
);

CREATE TABLE public.bet_transactions (
  transaction_id UUID REFERENCES points_transactions(id),
  bet_id UUID,
  match_id UUID
);

CREATE TABLE public.referral_transactions (
  transaction_id UUID REFERENCES points_transactions(id),
  referrer_id UUID,
  referral_code VARCHAR(50)
);

-- And so on...
```

**Pros**:
- Type-specific fields only present where needed
- Clean separation of concerns
- Foreign key constraints possible

**Cons**:
- More complex queries requiring joins
- More tables to manage
- More complex application code

## Event Grouping

We added an `event_id` column to group related transactions that result from the same event. This is particularly useful for:

1. **Bet Settlement**: When a bet is settled, it generates multiple transactions (BET_WON, BET_LOST, BET_WIN_BONUS) across different users.

2. **Audit Trail**: Makes it easier to trace all transactions related to a single business event.

3. **Consistency**: Helps ensure that all parts of a multi-transaction event are processed together.

## Indexing Strategy

To support efficient queries while using the JSONB approach, we've implemented:

1. **GIN Index on Metadata**: Allows efficient searching within the JSONB structure.
   ```sql
   CREATE INDEX idx_points_transactions_metadata
   ON public.points_transactions USING GIN (metadata);
   ```

2. **Standard Indexes**: For commonly queried fields like user_id, transaction_type, and event_id.

3. **Row-Level Security**: Updated to work with the JSONB structure:
   ```sql
   USING (
     auth.uid() = user_id OR 
     auth.uid()::text = (metadata->>'related_user_id')::text
   );
   ```

## Conclusion

The JSONB metadata approach provides the best balance of flexibility, storage efficiency, and query capability for our use case. While there are some tradeoffs in terms of query complexity and foreign key constraints, the benefits of a more adaptable schema outweigh these drawbacks, especially considering the evolving nature of the points system.

As the system grows, we can easily adapt the metadata structure without requiring schema migrations, making it more maintainable in the long term. 