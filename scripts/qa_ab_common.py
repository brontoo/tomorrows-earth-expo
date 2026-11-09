"""Read-only account fixtures for the owner A/B session; no media/model substitution."""
import re,json
from pathlib import Path
from urllib.parse import unquote,urlparse
IDS=['abu-dhabi', 'dubai', 'sharjah', 'ajman', 'umm-al-quwain', 'ras-al-khaimah', 'fujairah']

def bind_read_only_api(context, app, state, blocked):
    bindings = re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*missionSlug:\s*"([^"]+)"',
                          Path(app,'client/src/components/book/chapters.ts').read_text())
    def mutation_guard(route):
        if route.request.method not in ('GET', 'HEAD', 'OPTIONS'):
            blocked.append(dict(method=route.request.method, reason='Non-read request blocked'))
            route.abort()
        else:
            route.continue_()  # Actual GET response bytes are never replaced.
    context.route('**/*', mutation_guard)
    def api(route):
        if route.request.method not in ('GET','OPTIONS'):
            blocked.append(dict(method=route.request.method,reason='API mutation blocked'))
            route.abort();return
        rows=[]
        for name in unquote(urlparse(route.request.url).path.split('/api/trpc/')[-1]).split(','):
            if name=='auth.me':
                value=dict(id=9101,email='physical-qa@example.invalid',name='Read-only camera QA',role='student',openId='physical-qa')
            elif name=='missions.getAll':
                value=[dict(id=i+1,slug=c[2],title=c[1]) for i,c in enumerate(bindings)]
            elif name=='passport.getMine':
                value=dict(missionStates=[dict(missionId=i,status='verified') for i in state['verified']],totalPoints=25*len(state['verified']),badges=[])
            elif name in ('projects.getStats','teacher.getAnalytics'):
                value=dict(totalProjects=0,totalStudents=0,totalVotes=0)
            else:value=[]
            rows.append({'result':{'data':{'json':value}}})
        route.fulfill(content_type='application/json',body=json.dumps(rows))
    context.route('**/api/trpc/**',api)

