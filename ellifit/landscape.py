"""Adaptive display mesh and conditional confidence sets of angular means.

Every vertex is evaluated with the physical model. Confidence sets concern
measurement scatter only; fixed model/calibration values are not validated.
"""
from __future__ import annotations

import copy
import math
import numpy as np
from scipy.spatial import Delaunay
from scipy.optimize import brentq
from scipy.stats import f as f_distribution

from .core import period, put, safe_list, wrap


class MeanCompatibility:
    def __init__(self,obj):
        self.obj=obj
        self.available=bool(obj.analysis.active)
        self.counts=np.asarray(obj.analysis.raw.counts,float)
        self.groups=len(self.counts)
        self.means=np.array([[r['mean_delta'],r['mean_psi']] for r in obj.analysis.records])
        self.precisions=np.asarray(obj.analysis.precisions,float) if self.available else None

    def from_prediction(self,delta,psi):
        if not self.available:return np.full(len(delta),np.nan)
        residual=np.stack((wrap(delta-self.means[:,0]),psi-self.means[:,1]),axis=-1)
        t2=np.einsum('bgi,gij,bgj->bg',residual,self.precisions,residual)*self.counts
        f=t2*(self.counts-2)/(2*(self.counts-1))
        p=f_distribution.sf(f,2,self.counts-2)
        # Bonferroni inversion of simultaneous per-angle mean confidence sets.
        # With one angle this is the exact ordinary Hotelling-T² inversion.
        return np.minimum(1.,self.groups*np.min(p,axis=1))

    def evaluate(self,z):
        rms=[];probability=[]
        for start in range(0,len(z),5000):
            d,p=self.obj.prediction(z[start:start+5000])
            rms.extend(self.obj.analysis.raw_rms(d,p))
            probability.extend(self.from_prediction(d,p))
        return np.asarray(rms),np.asarray(probability)

    def public(self):
        return dict(available=self.available,method=('Hotelling-T² für den gemeinsamen Winkelmittelwert' if self.groups==1 else
            'Simultaner Hotelling-T²-Mittelwertvergleich mit Bonferroni-Korrektur'),
            groups=self.groups,repetitions=self.counts.astype(int).tolist(),
            assumptions='Unabhängige, lokal normalverteilte Wiederholungen derselben Probe. Nur Messstreuung; alle übrigen Modell- und Kalibrierwerte sind fest.',
            note='Messverträglichkeitsbereich, keine Wahrscheinlichkeit für das wahre Parameterpaar und kein Nachweis eines korrekten Schichtmodells. Ein endliches Netz kann schmale Bereiche übersehen.',
            unavailable_reason=None if self.available else 'Ohne aktiv verwendete geeignete Wiederholkovarianzen ist kein statistischer Lösungsbereich bestimmbar.')


def _unique(points):
    points=np.clip(np.asarray(points,float),0,1)
    _,indices=np.unique(np.round(points,12),axis=0,return_index=True)
    return points[np.sort(indices)]


def _triangles(vertices):
    # QJ retains almost coincident minimum/profile anchors that ordinary Qhull
    # may classify as coplanar and omit from all faces. The original evaluated
    # coordinates and heights stay unchanged; orient faces in those coordinates.
    tri=Delaunay(vertices,qhull_options='Qbb Qc Q12 QJ').simplices
    a,b,c=(vertices[tri[:,i]] for i in range(3))
    reverse=(b[:,0]-a[:,0])*(c[:,1]-a[:,1])-(b[:,1]-a[:,1])*(c[:,0]-a[:,0])<0
    tri[reverse]=tri[reverse][:,[0,2,1]]
    return tri


def _contains(point,polygon):
    x,y=point;inside=False
    for a,b in zip(polygon,np.roll(polygon,-1,axis=0)):
        if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:inside=not inside
    return inside


def _boundaries(vertices,triangles,p,alpha):
    """Clip triangles by their linearly sampled confidence score; join rings.

    Directed internal edges cancel. Remaining CCW outer rings and CW holes
    retain topology, including confidence sets clipped by the search box.
    """
    edges={};positions={}
    def cross(a,b):
        if abs(p[a]-alpha)<1e-12:return int(a)
        if abs(p[b]-alpha)<1e-12:return int(b)
        key=('e',int(min(a,b)),int(max(a,b)))
        if key not in positions:
            t=(alpha-p[a])/(p[b]-p[a]);positions[key]=vertices[a]+t*(vertices[b]-vertices[a])
        return key
    def position(key):return vertices[key] if isinstance(key,int) else positions[key]
    for tri in triangles:
        if not np.isfinite(p[tri]).all() or np.max(p[tri])<alpha:continue
        nodes=[]
        for a,b in zip(tri,np.roll(tri,-1)):
            a,b=int(a),int(b)
            if p[a]>=alpha:nodes.append(a)
            if (p[a]>=alpha)!=(p[b]>=alpha):nodes.append(cross(a,b))
        if len(nodes)<3:continue
        for a,b in zip(nodes,nodes[1:]+nodes[:1]):
            if a==b:continue
            reverse=(b,a)
            if reverse in edges:del edges[reverse]
            else:edges[(a,b)]=True
    outgoing={}
    for a,b in edges:outgoing.setdefault(a,[]).append(b)
    rings=[];unclosed=0
    while outgoing:
        start=next(iter(outgoing));key=start;ring=[]
        for _ in range(len(edges)+1):
            ring.append(position(key))
            if key not in outgoing:break
            nextkey=outgoing[key].pop()
            if not outgoing[key]:del outgoing[key]
            key=nextkey
            if key==start:
                points=np.asarray(ring)
                area=float(np.sum(points[:,0]*np.roll(points[:,1],-1)-points[:,1]*np.roll(points[:,0],-1))/2)
                if abs(area)>1e-17:rings.append((points,area))
                break
        else:unclosed+=1;continue
        if key!=start:unclosed+=1
    return rings,unclosed


def _profile_regions(obj,grids,solutions,profile,compatibility):
    """Follow thin confidence bands with directly evaluated cross sections.

    Generic triangulation can split a highly curved, micrometre-thin ribbon
    into spurious islands even when every vertex is exact. Follow the known
    conditional valley instead; disclose that additional profile branches may
    be missed. Periodic copies are shifted analytically and checked again.
    """
    from .diagnostics import _profile_minimum
    fixed=profile['fixed_index'];free=profile['profiled_index']
    cache={}
    def minimum(value):
        key=float(value)
        if key not in cache:
            values,_,period,flat=_profile_minimum(obj,fixed,key,grids)
            z=obj.encode(values)[0]
            rms,p=compatibility.evaluate(z[None,:])
            cache[key]=(z,float(rms[0]),float(p[0]),period,flat)
        return cache[key]
    for point in profile['points']:
        if point['rmse_deg'] is None:continue
        value=point['values'][fixed];z=obj.encode(point['values'])[0]
        model=copy.deepcopy(obj.model)
        for path,v in zip(obj.paths,point['values']):put(model,path,v)
        cycle=period(model,obj.paths[free],float(obj.obs.angles[0]))
        rms,p=compatibility.evaluate(z[None,:])
        cache[value]=(z,float(rms[0]),float(p[0]),cycle,point['flat_in_profiled_parameter'])
    axis=np.array(sorted(cache));levels=[];anchors=[]
    span=obj.req.parameters[fixed].upper-obj.req.parameters[fixed].lower
    for level in (.95,.99):
        alpha=1-level
        crossings=[]
        for a,b in zip(axis[:-1],axis[1:]):
            pa,pb=minimum(a)[2],minimum(b)[2]
            if (pa-alpha)*(pb-alpha)<0:
                crossings.append(brentq(lambda x:minimum(x)[2]-alpha,a,b,xtol=max(1e-12,span*1e-11)))
        boundaries=[axis[0],*crossings,axis[-1]]
        polygons=[]
        for left,right in zip(boundaries[:-1],boundaries[1:]):
            if minimum((left+right)/2)[2]<alpha:continue
            count=max(129,min(500,int(math.ceil((right-left)/(span*.0015)))+1))
            xx=np.unique(np.r_[np.linspace(left,right,count),axis[(axis>left)&(axis<right)]])
            records=[minimum(x) for x in xx]
            centers=np.array([r[0] for r in records]);periods=np.array([r[3] if r[3] else np.nan for r in records])
            if all(r[4] for r in records):continue
            bounds=[]
            for sign in (-1,1):
                inside=centers.copy();outside=centers.copy();bracket=np.zeros(len(xx),bool)
                for step in np.geomspace(1e-8,1,25):
                    candidate=centers.copy();candidate[:,free]=np.clip(centers[:,free]+sign*step,0,1)
                    _,pp=compatibility.evaluate(candidate)
                    failed=(pp<alpha)&~bracket
                    outside[failed]=candidate[failed];bracket|=failed
                    good=~bracket;inside[good]=candidate[good]
                outside[~bracket]=inside[~bracket]
                for _ in range(22):
                    middle=(inside+outside)/2;_,pp=compatibility.evaluate(middle)
                    good=(pp>=alpha)&bracket
                    inside[good]=middle[good];outside[(~good)&bracket]=middle[(~good)&bracket]
                bounds.append(inside)
            low,high=(obj.decode(b) for b in bounds)
            physical_centers=obj.decode(centers)
            if np.isfinite(periods).all():
                orders=range(min(100,1+int(np.max((obj.req.parameters[free].upper-physical_centers[:,free])/periods))))
            else:orders=range(1)
            for order in orders:
                lower,upper,cc=low.copy(),high.copy(),physical_centers.copy()
                if order:
                    lower[:,free]+=order*periods;upper[:,free]+=order*periods;cc[:,free]+=order*periods
                par=obj.req.parameters[free]
                valid=(lower[:,free]<=par.upper)&(upper[:,free]>=par.lower)
                lower[:,free]=np.clip(lower[:,free],par.lower,par.upper);upper[:,free]=np.clip(upper[:,free],par.lower,par.upper)
                # Never join a phase-wrap jump or a missing part of the domain.
                jumps=abs(np.diff(centers[:,free]))>.15
                segments=[];start=None
                for i,ok in enumerate(valid):
                    if ok and start is None:start=i
                    if start is not None and (not ok or i==len(valid)-1 or (i<len(jumps) and jumps[i])):
                        end=i+1 if ok else i
                        if end-start>=2:segments.append((start,end))
                        start=None
                for a,b in segments:
                    values=np.vstack((lower[a:b],upper[a:b][::-1]))
                    z=obj.encode(values);rr,pp=compatibility.evaluate(z)
                    members=[]
                    for solution in solutions:
                        for alias in solution['aliases']:
                            if _contains(obj.encode(alias['values'])[0],z):members.append(dict(family=solution['rank'],alias=alias['index']))
                    polygons.append(dict(loops=[dict(values=values.tolist(),rmse_deg=safe_list(rr))],members=members,
                        bounds=np.c_[values.min(axis=0),values.max(axis=0)].tolist(),normalized_width=np.ptp(z,axis=0).tolist(),
                        clipped=bool(np.any((z<1e-8)|(z>1-1e-8)) or a>0 or b<len(xx))))
                    anchors.extend(z);anchors.extend(obj.encode(cc[a:b]))
        levels.append(dict(confidence=level,polygons=polygons,unclosed_boundaries=0,approximate=True,
            broad=any(max(p['normalized_width'])>.05 for p in polygons),method='Nachgerechnete Profilquerschnitte'))
    return levels,np.asarray(anchors)


def build_landscape(obj,grids,solutions,diagnostics,progress):
    """Build a bounded-size display mesh, retaining ALL explicit valley points."""
    if len(obj.paths)!=2:return None,None
    compatibility=MeanCompatibility(obj)
    profile=diagnostics.get('profile')
    anchors=[a['values'] for s in solutions for a in s['aliases']]
    if profile:anchors.extend(p['values'] for p in profile['overlay'])
    anchor_z=obj.encode(anchors)
    additions=[anchor_z]
    # Ribbons sample steep transverse sides of very narrow valleys.
    if profile:
        col=profile['profiled_index']
        offsets=np.r_[-np.geomspace(.018,2e-7,11),0,np.geomspace(2e-7,.018,11)]
        strip=np.repeat(anchor_z,len(offsets),axis=0)
        strip[:,col]+=np.tile(offsets,len(anchor_z));additions.append(strip)
    for solution in solutions[:24]:
        covariance=solution['uncertainty'].get('covariance_statistical')
        if covariance is None:continue
        eig,vec=np.linalg.eigh(covariance)
        angles=np.linspace(0,2*np.pi,41)[:-1]
        circle=np.c_[np.cos(angles),np.sin(angles)]@np.diag(np.sqrt(np.maximum(eig,0)))@vec.T
        for alias in solution['aliases'][:30]:
            for radius in (1.,3.,10.,30.,100.):
                values=np.asarray(alias['values'])+radius*circle
                for i,par in enumerate(obj.req.parameters):values[:,i]=np.clip(values[:,i],par.lower,par.upper)
                additions.append(obj.encode(values))
    axes=[g[np.unique(np.rint(np.linspace(0,len(g)-1,min(len(g),201))).astype(int))] for g in grids]
    meshgrid=np.meshgrid(*axes,indexing='ij')
    base=np.column_stack([g.ravel() for g in meshgrid])
    vertices=_unique(np.vstack([*additions,base]))
    progress(94,'Zusätzliche Talstützpunkte und Flächennetz berechnen')
    rms,p=compatibility.evaluate(vertices)
    added=0;max_error=0.
    for iteration in range(2):
        tri=_triangles(vertices)
        centers=vertices[tri].mean(axis=1)
        actual,pc=compatibility.evaluate(centers)
        approx=np.mean(np.log10(np.maximum(rms[tri],1e-9)),axis=1)
        error=abs(np.log10(np.maximum(actual,1e-9))-approx)
        interesting=(np.min(rms[tri],axis=1)<1.) | (actual<1.)
        if compatibility.available:interesting|=(np.max(p[tri],axis=1)>.01)|(pc>.01)
        ids=np.flatnonzero(interesting & np.isfinite(error) & (error>.22))
        if not len(ids):break
        chosen=ids[np.argsort(error[ids])[-6000:]]
        max_error=max(max_error,float(error[chosen].max()))
        vertices=np.vstack([vertices,centers[chosen]])
        rms=np.r_[rms,actual[chosen]];p=np.r_[p,pc[chosen]];added+=len(chosen)
    # Resolve the confidence boundaries across thin strips with actual model
    # evaluations rather than treating a linear p-value interpolation as exact.
    if compatibility.available and not profile:
        tri=_triangles(vertices)
        edge=np.unique(np.sort(np.vstack((tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]])),axis=1),axis=0)
        boundary=[]
        for alpha in (.05,.01):
            chosen=edge[(p[edge[:,0]]-alpha)*(p[edge[:,1]]-alpha)<0]
            if len(chosen)>7000:chosen=chosen[np.linspace(0,len(chosen)-1,7000).astype(int)]
            if not len(chosen):continue
            inside=np.where((p[chosen[:,0]]>=alpha)[:,None],vertices[chosen[:,0]],vertices[chosen[:,1]])
            outside=np.where((p[chosen[:,0]]<alpha)[:,None],vertices[chosen[:,0]],vertices[chosen[:,1]])
            for _ in range(15):
                middle=(inside+outside)/2;_,pm=compatibility.evaluate(middle)
                good=pm>=alpha
                inside[good]=middle[good];outside[~good]=middle[~good]
            boundary.extend(inside)
        if boundary:
            boundary=np.asarray(boundary);rr,pp=compatibility.evaluate(boundary)
            vertices=np.vstack((vertices,boundary));rms=np.r_[rms,rr];p=np.r_[p,pp]
    # Deduplicate after bisection, retaining the original minimum/valley anchors.
    _,indices=np.unique(np.round(vertices,12),axis=0,return_index=True);indices=np.sort(indices)
    vertices=vertices[indices];rms=rms[indices];p=p[indices]
    tri=_triangles(vertices)
    valid=np.isfinite(rms) & (rms<=180)
    tri=tri[np.all(valid[tri],axis=1)]
    values=obj.decode(vertices)
    regions=compatibility.public();regions['levels']=[]
    if compatibility.available and profile:
        progress(97,'Schmale Lösungsregionen entlang des Talprofils nachrechnen')
        levels,extra=_profile_regions(obj,grids,solutions,profile,compatibility)
        regions['levels']=levels
        regions['note']+=' Profilbereiche folgen dem ermittelten bedingten Minimum; zusätzliche Äste können fehlen.'
        if len(extra):
            rr,pp=compatibility.evaluate(extra)
            vertices=np.vstack((vertices,extra));rms=np.r_[rms,rr];p=np.r_[p,pp]
            _,indices=np.unique(np.round(vertices,12),axis=0,return_index=True);indices=np.sort(indices)
            vertices=vertices[indices];rms=rms[indices];p=p[indices]
            tri=_triangles(vertices);values=obj.decode(vertices)
            tri=tri[np.all((np.isfinite(rms)&(rms<=180))[tri],axis=1)]
    elif compatibility.available:
        progress(97,'Messverträgliche Lösungsregionen und Grenzen bestimmen')
        for level in (.95,.99):
            rings,unclosed=_boundaries(vertices,tri,p,1-level)
            outer=[ring for ring,area in rings if area>0]
            holes=[ring for ring,area in rings if area<0]
            polygons=[]
            for ring in outer:
                inner=[h for h in holes if _contains(h[0],ring)]
                members=[]
                for solution in solutions:
                    for alias in solution['aliases']:
                        z=obj.encode(alias['values'])[0]
                        if _contains(z,ring) and not any(_contains(z,h) for h in inner):
                            members.append(dict(family=solution['rank'],alias=alias['index']))
                loops=[]
                for loop in [ring,*inner]:
                    physical=obj.decode(loop);rr,_=compatibility.evaluate(loop)
                    loops.append(dict(values=physical.tolist(),rmse_deg=safe_list(rr)))
                physical=obj.decode(ring)
                polygons.append(dict(loops=loops,members=members,
                    bounds=np.c_[physical.min(axis=0),physical.max(axis=0)].tolist(),
                    normalized_width=np.ptp(ring,axis=0).tolist(),
                    clipped=bool(np.any((ring<1e-8)|(ring>1-1e-8)))))
            regions['levels'].append(dict(confidence=level,polygons=polygons,
                unclosed_boundaries=unclosed,approximate=True,
                broad=any(max(p['normalized_width'])>.05 for p in polygons)))
    mesh=dict(values=values.tolist(),rms=safe_list(rms),triangles=tri.tolist(),
        compatibility_p=safe_list(p) if compatibility.available else None,
        anchors=len(anchor_z),adaptive_points=added,base_points=len(base),
        vertices=len(vertices),refinement_rounds=2,
        note='Jeder Stützpunkt ist mit dem Schichtmodell berechnet; dazwischen ist die Fläche interpoliert. Talpunkte und Minima sind Teil des Netzes. Ein endliches Netz kann Details übersehen.')
    return mesh,regions
