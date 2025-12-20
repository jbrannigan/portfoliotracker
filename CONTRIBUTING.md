# Contributing to Portfolio Tracker

Thank you for your interest in contributing to Portfolio Tracker! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, professional, and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/portfoliotracker.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`
5. Run the dev server: `npm run dev`

## Development Workflow

### Project Structure

```
portfolio-tracker/
├── client/          # React frontend (Vite + TypeScript)
├── server/          # Express backend (Node.js + TypeScript)
├── shared/          # Shared TypeScript types
└── docs/            # Documentation
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Naming Conventions**:
  - Files: `camelCase.ts` for utilities, `PascalCase.tsx` for React components
  - Variables: `camelCase`
  - Types/Interfaces: `PascalCase`
  - Database columns: `snake_case`
- **Formatting**: Use Prettier (if configured) or follow existing code style
- **React**: Functional components only, use hooks

### Making Changes

1. **Backend Changes** (server/):
   - Add types to `shared/types.ts` if needed
   - Update database schema in `server/src/db/migrations.ts`
   - Add/modify routes in `server/src/routes/`
   - Add/modify services in `server/src/services/`
   - Test API endpoints with curl or Postman

2. **Frontend Changes** (client/):
   - Use shadcn/ui components where possible
   - Follow Tailwind CSS conventions
   - Use React Query for data fetching
   - Ensure responsive design (mobile-first)

3. **Database Changes**:
   - Update schema in `docs/DATA_MODEL.md`
   - Add migration in `server/src/db/migrations.ts`
   - Test migration on clean database

### Testing

```bash
# Test the API manually
curl http://localhost:3001/api/health

# Test imports
curl -X POST http://localhost:3001/api/import/schwab \
  -F "file=@path/to/schwab.csv"

# Access the database
sqlite3 ./data/portfolio.db
```

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add position detail page with TradingView charts
fix: Correct null handling in ratings display
docs: Update API specification for new endpoints
refactor: Simplify watchlist import logic
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## Pull Request Process

1. Ensure your code builds without errors: `npm run build`
2. Update documentation if you've changed APIs or added features
3. Create a pull request with:
   - Clear title describing the change
   - Description of what changed and why
   - Screenshots for UI changes
   - Reference any related issues

4. Wait for review and address feedback

## Areas for Contribution

### High Priority
- **Frontend Pages**: Complete remaining UI pages (see `docs/PROGRESS.md`)
- **Testing**: Add unit and integration tests
- **Error Handling**: Improve error messages and validation
- **Performance**: Optimize database queries and API responses

### Medium Priority
- **Features**: Add new import formats (E*TRADE, Fidelity, etc.)
- **Charts**: Additional TradingView widget integrations
- **Export**: More export formats (PDF reports, etc.)
- **Mobile**: PWA improvements for offline capability

### Low Priority
- **Documentation**: Improve setup guides and API docs
- **Accessibility**: ARIA labels and keyboard navigation
- **Internationalization**: Support for multiple languages

## Questions?

- Check the [docs/](./docs/) directory for detailed specifications
- Open an issue for bugs or feature requests
- Discussions for questions and ideas

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
