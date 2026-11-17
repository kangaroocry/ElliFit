"""Display the actual minimized objective without changing its minimizer."""
from __future__ import annotations
import numpy as np
from .core import safe_list


def definition(obj):
    angular=obj.req.metric=='angular';weighted=obj.analysis.active
    kind='weighted' if weighted else 'stokes' if not angular else 'mean_angles' if obj.req.duplicate_policy=='average' else 'angular'
    count=obj.analysis.raw.count if weighted else obj.analysis.display.count
    normalization=(2 if angular else 3)*count
    label={'weighted':'Gewichtete Fit-Abweichung','stokes':'Stokes-Abweichung','mean_angles':'Abweichung der Winkelmittelwerte','angular':'Winkel-RMS'}[kind]
    reason={'weighted':'Die Wiederholkovarianzen gewichten Δ, Ψ und deren Korrelation. Das Minimum kann vom ungewichteten Winkel-RMS abweichen.',
        'stokes':'Minimiert wird der Abstand der Stokes-Vektoren; dessen Minimum kann vom Winkel-RMS abweichen.',
        'mean_angles':'Die Winkelmittelwerte gehen gleichberechtigt ein; der Winkel-RMS aller Rohwerte gewichtet Winkel mit mehr Wiederholungen stärker.',
        'angular':'Ungewichteter gemeinsamer Fit aller Winkelresiduen; Fit-Abweichung und Winkel-RMS stimmen überein.'}[kind]
    return dict(kind=kind,label=label,unit='1' if weighted or not angular else 'degree',normalization=int(normalization),
        formula='sqrt(Q / K)',q_definition=('Σ rᵀ C⁻¹ r über die Rohwerte; C = Wiederholkovarianz je Winkel' if weighted else 'Σ ||s_theo − s_beobachtet||²' if not angular else 'Σ [wrap(Δ_theo − Δ_beobachtet)² + (Ψ_theo − Ψ_beobachtet)²]'),
        normalization_definition='2 je Winkelpaar für Winkelresiduen, 3 je Stokes-Vektor; bei Gewichtung über alle Rohwerte, sonst über die verwendeten Beobachtungen',
        differs_from_angular_rms=kind!='angular',note=reason,
        interpretation='Kleiner bedeutet eine bessere Zielfunktion innerhalb dieses Fits; kein eigenständiger Nachweis des Schichtmodells.')


def values(q,meta):
    x=np.asarray(q,float)
    return safe_list(np.sqrt(np.maximum(x,0)/meta['normalization']))


def mesh_scores(obj, vertices):
    scores=[];chunk=max(1,min(4000,250000//max(1,len(obj.obs.angles))))
    for start in range(0,len(vertices),chunk):scores.extend(obj.batch(vertices[start:start+chunk]))
    return safe_list(scores)
