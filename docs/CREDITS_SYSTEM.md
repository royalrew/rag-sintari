# Credits-system - Dokumentation

## Översikt

Systemet har uppdaterats till ett **credits-baserat system** där all användning mäts i credits istället för direkta gränser per månad.

## Implementering

### Backend

#### 1. Credits Pricing (`api/credits.py`)
- Definierar kostnader för olika actions:
  - 1 fråga = 1 credit
  - 1 dokumentsida vid indexering = 0.2 credits
  - 1000 embeddings = 3 credits
  - PDF Exporter Agent = 5 credits
  - AuditAgent = 10 credits

#### 2. Credits Database (`api/credits_db.py`)
- `user_credits`: Balans per användare
- `credit_transactions`: Alla transaktioner (köp, användning, expiration)
- `monthly_allocations`: Månadsvisa tilldelningar för subscription-planer
- Funktioner:
  - `get_balance()`: Hämta nuvarande balans
  - `add_credits()`: Lägg till credits (köp, allocation, bonus)
  - `use_credits()`: Använd credits
  - `allocate_monthly_credits()`: Allokera månadsvisa credits för subscription
  - `expire_old_credits()`: Expirera gamla credits (12 månader)

#### 3. Plan Configuration (`api/plans.py`)
Uppdaterad till credits-baserat:
- **Start**: 500 credits/månad
- **Pro**: 3 000 credits/månad
- **Enterprise**: Obegränsade credits (SLA)
- **Credits (PAYG)**: Inga månadscredits, måste köpa

#### 4. Plan Checker (`api/plan_checker.py`)
Uppdaterad för credits:
- `check_credits()`: Kontrollerar om användare har tillräckligt med credits
- `deduct_credits()`: Drar credits (använder månadsallokering först, sedan balans)
- `get_usage_stats()`: Returnerar credits-info istället för "X frågor/månad"

#### 5. Main Endpoints (`api/main.py`)
- `/query`: Kontrollerar och drar credits för frågor
- `/documents/upload`: Kontrollerar och drar credits för indexering

#### 6. Billing Webhooks (`api/billing.py`)
- Allokerar månadsvisa credits när subscription skapas/uppdateras

### Plan-logik

#### Subscription Plans (Start, Pro)
1. Får månadsvisa credits vid subscription-start
2. Använder månadsallokering först
3. Om månadsallokering tar slut, använder balans
4. Månadsallokering återställs varje månad

#### Enterprise
- Obegränsade credits (ingen deduction)

#### Credits (PAYG)
- Inga månadscredits
- Måste köpa credits-paket
- Credits gäller i 12 månader

## Credit-paket (PAYG)

Definierade i `api/credits.py`:
- 100 credits – 99 kr
- 500 credits – 399 kr
- 2 000 credits – 1 299 kr
- 10 000 credits – 4 990 kr (+15% bonus)
- 50 000 credits – offert

## Nästa Steg

### Backend (TODO)
- [ ] Endpoint för att köpa credits-paket
- [ ] Endpoint för att se credits-historik
- [ ] Automatisk månadsallokering vid subscription renewal
- [ ] Expiration-job för gamla credits

### Frontend (TODO)
- [ ] Uppdatera AccountPage för att visa credits istället för "X frågor/månad"
- [ ] Credits-köp UI för PAYG-plan
- [ ] Credits-historik
- [ ] Progress bars för credits-användning

## Användning

### Kontrollera credits
```python
from api.plan_checker import check_credits
from api.credits import calculate_query_cost

cost = calculate_query_cost()
if not check_credits(user_id, cost, plan_name):
    raise HTTPException(403, "Otillräckliga credits")
```

### Använd credits
```python
from api.plan_checker import deduct_credits
from api.credits import calculate_query_cost

cost = calculate_query_cost()
deduct_credits(user_id, cost, "Query: ...")
```

### Lägg till credits (vid köp)
```python
from api.credits_db import get_credits_db

credits_db = get_credits_db()
credits_db.add_credits(user_id, 100, "purchase", "Köpt 100 credits")
```

### Allokera månadsvisa credits
```python
from api.credits_db import get_credits_db

credits_db = get_credits_db()
credits_db.allocate_monthly_credits(user_id, 500)  # Start plan
```

## Databas-schema

### user_credits
- `user_id` (PRIMARY KEY)
- `balance` (REAL)
- `last_updated` (TEXT)

### credit_transactions
- `id` (PRIMARY KEY)
- `user_id` (INTEGER)
- `amount` (REAL)
- `type` (TEXT): "purchase" | "allocation" | "usage" | "expiration" | "refund" | "bonus"
- `description` (TEXT)
- `expires_at` (TEXT, nullable)
- `created_at` (TEXT)

### monthly_allocations
- `id` (PRIMARY KEY)
- `user_id` (INTEGER)
- `month` (TEXT): "YYYY-MM"
- `credits` (REAL)
- `used` (REAL)
- `created_at` (TEXT)

