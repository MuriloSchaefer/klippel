#!/usr/bin/env python3
"""
Analyze React DevTools Profiler JSON and/or Chrome Performance trace
to find root causes of re-render groups.

Usage:
    python analyze_rerenders.py -c ComponentA,ComponentB --profiler trace.json
    python analyze_rerenders.py -c ComponentA -c ComponentB --perf perf.json
    python analyze_rerenders.py -c ModelViewport,ElectiveToggle --profiler prof.json --perf perf.json
"""

import argparse
import json
import sys
from collections import defaultdict


# ─── helpers ────────────────────────────────────────────────────────────────

def build_id_map(snapshots):
    m = {}
    for entry in snapshots:
        fid, info = entry
        m[fid] = info
    return m

def name_of(fid, id_map):
    info = id_map.get(fid)
    if info is None:
        return f'<fiber {fid}>'
    return info.get('displayName') or info.get('name') or f'<fiber {fid}>'

def owner_chain(fid, id_map, max_depth=8):
    chain, seen, cur = [], set(), fid
    for _ in range(max_depth):
        if cur in seen:
            break
        seen.add(cur)
        info = id_map.get(cur)
        if info is None:
            break
        chain.append(name_of(cur, id_map))
        owner = info.get('ownerId')
        if not owner or owner == cur:
            break
        cur = owner
    return chain

def parent_chain(fid, id_map, max_depth=8):
    chain, seen, cur = [], set(), fid
    for _ in range(max_depth):
        if cur in seen:
            break
        seen.add(cur)
        info = id_map.get(cur)
        if info is None:
            break
        chain.append(name_of(cur, id_map))
        parent = info.get('parentId')
        if not parent or parent == cur:
            break
        cur = parent
    return chain

def matches_any(name, targets):
    name_lower = name.lower()
    return any(t.lower() in name_lower for t in targets)


# ─── profiler analysis ──────────────────────────────────────────────────────

def analyze_profiler(profiler_file, targets):
    print("=" * 80)
    print("REACT DEVTOOLS PROFILER ANALYSIS")
    print("=" * 80)

    with open(profiler_file) as f:
        data = json.load(f)

    root = data['dataForRoots'][0]
    id_map = build_id_map(root['snapshots'])
    commits = root['commitData']

    print(f"\nTotal commits: {len(commits)}")
    print(f"Total fiber IDs tracked: {len(id_map)}")
    print(f"Tracking components: {targets}")

    for i, commit in enumerate(commits):
        ts = commit['timestamp']
        dur = commit['duration']
        cd_list = commit.get('changeDescriptions', [])
        fiber_durations = dict(commit.get('fiberActualDurations', []))
        updaters = commit.get('updaters', []) or []

        print(f"\n{'─'*70}")
        print(f"COMMIT {i}  |  ts={ts:.1f}ms  dur={dur:.2f}ms  re-renders={len(cd_list)}")

        if updaters:
            print("  Updaters (what triggered this commit):")
            for u in updaters:
                if isinstance(u, dict):
                    print(f"    • {u.get('displayName') or u.get('name') or u}")
                else:
                    print(f"    • {u}")

        hooks_changed, props_changed, first_mounts, context_changed, other = [], [], [], [], []

        for entry in cd_list:
            fid, desc = entry
            cname = name_of(fid, id_map)
            if desc.get('isFirstMount', False):
                first_mounts.append((fid, cname, desc))
            elif desc.get('didHooksChange', False):
                hooks_changed.append((fid, cname, desc))
            elif desc.get('props'):
                props_changed.append((fid, cname, desc))
            elif desc.get('context', False):
                context_changed.append((fid, cname, desc))
            else:
                other.append((fid, cname, desc))

        if first_mounts:
            print(f"  First mounts ({len(first_mounts)}):", [n for _, n, _ in first_mounts[:5]],
                  '...' if len(first_mounts) > 5 else '')

        if hooks_changed:
            print(f"\n  HOOKS CHANGED ({len(hooks_changed)} components):")
            for fid, cname, desc in hooks_changed:
                dur_f = fiber_durations.get(fid, 0)
                owner = owner_chain(fid, id_map, 5)
                print(f"    [{fid}] {cname}  (self={dur_f:.2f}ms)")
                print(f"         hooks indices: {desc.get('hooks')}")
                print(f"         owner chain: {' -> '.join(owner)}")

        if props_changed:
            print(f"\n  PROPS CHANGED ({len(props_changed)} components):")
            for fid, cname, desc in props_changed:
                dur_f = fiber_durations.get(fid, 0)
                owner = owner_chain(fid, id_map, 5)
                print(f"    [{fid}] {cname}  (self={dur_f:.2f}ms)")
                print(f"         changed props: {desc.get('props')}")
                print(f"         owner chain: {' -> '.join(owner)}")

        if context_changed:
            print(f"\n  CONTEXT CHANGED ({len(context_changed)} components):")
            for fid, cname, desc in context_changed[:10]:
                print(f"    [{fid}] {cname}")

        if other and len(other) < 30:
            print(f"\n  OTHER re-renders ({len(other)}):")
            for fid, cname, desc in other:
                dur_f = fiber_durations.get(fid, 0)
                print(f"    [{fid}] {cname}  state={desc.get('state')}  (self={dur_f:.2f}ms)")

        target_hits = [
            (fid, name_of(fid, id_map), desc)
            for fid, desc in cd_list
            if matches_any(name_of(fid, id_map), targets)
        ]
        if target_hits:
            print(f"\n  *** TARGET COMPONENTS in this commit ***")
            for fid, cname, desc in target_hits:
                dur_f = fiber_durations.get(fid, 0)
                owner = owner_chain(fid, id_map, 6)
                parent = parent_chain(fid, id_map, 6)
                print(f"    [{fid}] {cname}")
                print(f"         didHooksChange={desc.get('didHooksChange')}  hooks={desc.get('hooks')}  props={desc.get('props')}  ctx={desc.get('context')}  isFirstMount={desc.get('isFirstMount')}")
                print(f"         self_duration={dur_f:.2f}ms")
                print(f"         owner chain : {' -> '.join(owner)}")
                print(f"         parent chain: {' -> '.join(parent)}")

    print("\n" + "=" * 80)
    print("FIBER ID LOOKUP FOR TARGET COMPONENTS")
    print("=" * 80)
    for t in targets:
        matches = [(fid, info) for fid, info in id_map.items()
                   if t.lower() in (name_of(fid, id_map) or '').lower()]
        for fid, _ in matches[:5]:
            owner = owner_chain(fid, id_map, 8)
            print(f"  {name_of(fid, id_map)} [fid={fid}]  owner chain: {' -> '.join(owner)}")

    return id_map, commits


# ─── deep dive: top N commits by re-render count ─────────────────────────────

def deep_dive_targets(id_map, commits, targets, top_n=3):
    print("\n" + "=" * 80)
    print(f"DEEP DIVE: TOP {top_n} COMMITS BY RE-RENDER COUNT")
    print("=" * 80)

    ranked = sorted(
        enumerate(commits),
        key=lambda x: len(x[1].get('changeDescriptions', [])),
        reverse=True
    )
    big_commit_indices = [i for i, _ in ranked[:top_n]]

    for ci in sorted(big_commit_indices):
        commit = commits[ci]
        ts = commit['timestamp']
        dur = commit['duration']
        cd_list = commit.get('changeDescriptions', [])
        fiber_durations = dict(commit.get('fiberActualDurations', []))
        updaters = commit.get('updaters', []) or []

        print(f"\n{'═'*70}")
        print(f"COMMIT {ci}  ts={ts:.1f}ms  dur={dur:.2f}ms  re-renders={len(cd_list)}")

        if updaters:
            print("  Updaters:")
            for u in updaters:
                if isinstance(u, dict):
                    print(f"    • {u.get('displayName') or u.get('name') or u}")
                else:
                    print(f"    • {u}")

        cd_map = {entry[0]: entry[1] for entry in cd_list}

        top_by_dur = sorted(fiber_durations.items(), key=lambda x: -x[1])[:20]
        print("\n  Top 20 components by self-duration:")
        for fid, d in top_by_dur:
            desc = cd_map.get(fid, {})
            print(f"    {name_of(fid, id_map):40s} [{fid:5d}] self={d:.2f}ms"
                  f"  hooks={desc.get('didHooksChange')}  props={desc.get('props')}  hooksIdx={desc.get('hooks')}")

        hooks_comps = [(fid, desc) for fid, desc in cd_map.items() if desc.get('didHooksChange')]
        print(f"\n  Components with hooks changed: {len(hooks_comps)}")
        for fid, desc in sorted(hooks_comps, key=lambda x: -fiber_durations.get(x[0], 0)):
            cname = name_of(fid, id_map)
            owner = owner_chain(fid, id_map, 6)
            print(f"    {cname:40s} [{fid}]  hooks={desc.get('hooks')}  self={fiber_durations.get(fid,0):.2f}ms")
            print(f"         owner: {' -> '.join(owner)}")

        props_comps = [(fid, desc) for fid, desc in cd_map.items() if desc.get('props')]
        print(f"\n  Components with props changed: {len(props_comps)}")
        for fid, desc in sorted(props_comps, key=lambda x: -fiber_durations.get(x[0], 0)):
            cname = name_of(fid, id_map)
            owner = owner_chain(fid, id_map, 6)
            print(f"    {cname:40s} [{fid}]  props={desc.get('props')}  self={fiber_durations.get(fid,0):.2f}ms")
            print(f"         owner: {' -> '.join(owner)}")

        print("\n  ── KEY COMPONENTS ──")
        for fid, desc in cd_map.items():
            cname = name_of(fid, id_map)
            if not matches_any(cname, targets):
                continue
            dur_f = fiber_durations.get(fid, 0)
            owner = owner_chain(fid, id_map, 8)
            parent = parent_chain(fid, id_map, 8)
            info = id_map.get(fid, {})
            child_names = [name_of(c, id_map) for c in info.get('children', [])]
            print(f"\n    {cname} [{fid}]  self={dur_f:.2f}ms")
            print(f"      didHooksChange : {desc.get('didHooksChange')}")
            print(f"      hooks (indices): {desc.get('hooks')}")
            print(f"      props changed  : {desc.get('props')}")
            print(f"      context changed: {desc.get('context')}")
            print(f"      isFirstMount   : {desc.get('isFirstMount')}")
            print(f"      owner chain    : {' -> '.join(owner)}")
            print(f"      parent chain   : {' -> '.join(parent)}")
            print(f"      direct children: {child_names[:10]}")


# ─── chrome perf trace analysis ─────────────────────────────────────────────

def analyze_perf(perf_file, targets):
    print("\n" + "=" * 80)
    print("CHROME PERFORMANCE TRACE ANALYSIS")
    print("=" * 80)
    print(f"Tracking components: {targets}")

    print("Loading Chrome perf trace...")
    with open(perf_file, 'rb') as f:
        raw = f.read()

    print(f"  File size: {len(raw) / 1e6:.1f} MB")
    data = json.loads(raw)
    del raw

    trace_events = data.get('traceEvents', data) if isinstance(data, dict) else data
    print(f"  Total trace events: {len(trace_events)}")

    react_events = []
    for ev in trace_events:
        if not isinstance(ev, dict):
            continue
        if ev.get('cat') != 'blink.user_timing':
            continue
        if ev.get('ph') not in ('b', 'B', 'R', 'n', 'I'):
            continue
        args = ev.get('args', {})
        detail_str = args.get('detail', '')
        if not detail_str or 'React' not in str(detail_str):
            continue
        if isinstance(detail_str, str):
            try:
                detail = json.loads(detail_str)
            except Exception:
                detail = {}
        else:
            detail = detail_str
        react_events.append((ev, detail))

    print(f"  React blink.user_timing events found: {len(react_events)}")

    prop_diff_events = []
    hook_events = []

    for ev, detail in react_events:
        name = ev.get('name', '')
        ts = ev.get('ts', 0) / 1000.0
        changes = detail.get('changes', []) or detail.get('propDiffs', []) or []
        comp = detail.get('componentName', detail.get('name', name))
        warnings = detail.get('warnings', []) or []
        has_unequal = any('Referentially unequal' in str(w) or 'unequal' in str(w).lower() for w in warnings)

        if changes or has_unequal:
            prop_diff_events.append((ts, comp, changes, warnings, detail))
        if 'hook' in str(detail).lower():
            hook_events.append((ts, comp, detail))

    target_events = []
    for ev, detail in react_events:
        name = ev.get('name', '')
        ts = ev.get('ts', 0) / 1000.0
        detail_str = str(detail)
        for t in targets:
            if t.lower() in name.lower() or t.lower() in detail_str.lower():
                target_events.append((ts, t, name, detail))
                break

    print(f"\n  Events with prop diffs or unequal warnings: {len(prop_diff_events)}")
    print(f"  Events mentioning target components: {len(target_events)}")

    print("\n── PROP DIFF / UNEQUAL FUNCTION events for TARGET COMPONENTS ──")
    shown = 0
    for ts, comp, changes, warnings, detail in prop_diff_events:
        if not matches_any(comp, targets):
            continue
        shown += 1
        print(f"\n  ts={ts:.2f}ms  component={comp}")
        if changes:
            print(f"  changes: {json.dumps(changes, indent=4)[:800]}")
        if warnings:
            print(f"  warnings: {warnings}")

    if shown == 0:
        print("  (no target-component prop-diff events found)")
        print("\n  First 20 prop-diff events (any component):")
        for ts, comp, changes, warnings, _ in prop_diff_events[:20]:
            print(f"    ts={ts:.2f}ms  comp={comp}  changes={str(changes)[:200]}  warn={str(warnings)[:100]}")

    print("\n── TARGET COMPONENT events in Chrome trace ──")
    for ts, target, name, detail in target_events[:60]:
        print(f"  ts={ts:.2f}ms  target={target}  event_name={name!r}")
        keys = [k for k in detail.keys() if k not in ('componentName', 'name', 'type')]
        for k in keys[:6]:
            print(f"    {k}: {str(detail[k])[:200]}")

    print("\n── SCANNING for React update cause annotations ──")
    cause_events = []
    for ev, detail in react_events:
        ts = ev.get('ts', 0) / 1000.0
        name = ev.get('name', '')
        detail_str = json.dumps(detail)
        if any(kw in detail_str for kw in ['cause', 'reason', 'setState', 'dispatch', 'forceUpdate', 'Referentially']):
            comp = detail.get('componentName', detail.get('name', name))
            cause_events.append((ts, comp, name, detail))

    print(f"  Events with cause/reason/Referentially: {len(cause_events)}")
    for ts, comp, name, detail in cause_events[:40]:
        is_target = matches_any(comp, targets) or matches_any(name, targets)
        marker = '***' if is_target else '   '
        print(f"  {marker} ts={ts:.2f}ms comp={comp}  event={name!r}")
        for k, v in detail.items():
            if any(kw in str(k).lower() or kw in str(v).lower()
                   for kw in ['cause', 'reason', 'referentially', 'unequal', 'hook', 'prop']):
                print(f"       {k}: {str(v)[:300]}")

    print("\n── UNIQUE React blink.user_timing event names (first 50) ──")
    for n in sorted(set(ev.get('name', '') for ev, _ in react_events))[:50]:
        print(f"  {n!r}")

    print("\n── SAMPLE detail objects (first 5 react events) ──")
    for i, (ev, detail) in enumerate(react_events[:5]):
        print(f"\n  Event {i}: name={ev.get('name')!r}  ts={ev.get('ts',0)/1000:.2f}ms")
        print(f"  detail: {json.dumps(detail, indent=2)[:600]}")


# ─── entry point ─────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description='Analyze React re-renders from DevTools Profiler and/or Chrome Performance traces.'
    )
    parser.add_argument(
        '-c', '--components',
        action='append',
        metavar='NAMES',
        required=True,
        help='Component name(s) to track. Repeat -c or use comma-separated values. '
             'Example: -c ModelViewport,ElectiveToggle -c GarmentDetails'
    )
    parser.add_argument(
        '--profiler',
        metavar='FILE',
        help='Path to the React DevTools Profiler JSON export.'
    )
    parser.add_argument(
        '--perf',
        metavar='FILE',
        help='Path to the Chrome Performance trace JSON.'
    )
    parser.add_argument(
        '--deep-dive-top', '--top',
        type=int,
        default=3,
        metavar='N',
        dest='top_n',
        help='Number of top commits (by re-render count) to deep-dive. Default: 3.'
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if not args.profiler and not args.perf:
        print("Error: provide at least one of --profiler or --perf.", file=sys.stderr)
        sys.exit(1)

    # Flatten comma-separated values: [["A,B"], ["C"]] -> ["A", "B", "C"]
    targets = []
    for entry in args.components:
        targets.extend(t.strip() for t in entry.split(',') if t.strip())

    if args.profiler:
        id_map, commits = analyze_profiler(args.profiler, targets)
        deep_dive_targets(id_map, commits, targets, top_n=args.top_n)

    if args.perf:
        analyze_perf(args.perf, targets)


if __name__ == '__main__':
    main()
