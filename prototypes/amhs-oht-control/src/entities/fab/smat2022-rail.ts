/**
 * SMAT2022 `.rail` 임포터 — 실측 반도체 팹 AMHS 레일망 파서(방식 A, 뷰 전용).
 *
 * 공개 데이터셋 SMAT2022(LogiFabSim, Rank & Betker 2025; U-FAST 배포, MIT)의
 * `.rail` 텍스트를 파싱한다. 이 파일은 실제 팹 규모의 레일 토폴로지(노드·LINE/CURVE
 * 링크·툴그룹 매핑)를 담는다. 포트/장비 상세는 별도 CSV라 여기서는 다루지 않는다.
 *
 * `.rail` 포맷(탭 구분):
 *   RAILDATA
 *   SCALE   minX  maxX  minY  maxY                (mm)
 *   NODE    <id>  <x>   <y>                        (mm)
 *   LINK    <sec> LINE|CURVE <from> <to>
 *   RAILLIST <sec> LINE|CURVE <from> <to> x1 y1 x2 y2 <angle°> <length_mm>
 *   EQTONODEMAP <toolGroup> <nodeId>
 *   TEXT    <label> EQ <x> <y>                     (mm)
 *
 * 좌표는 원본 mm 그대로 반환한다(미터/화면 변환은 뷰 계층에서 수행).
 */

export interface Smat2022Link {
  section: number;
  from: number;
  to: number;
  curve: boolean;
  a: [number, number];
  b: [number, number];
  /** 링크 길이(mm) */
  length: number;
}

export interface Smat2022ToolGroup {
  name: string;
  /** 대표 rail 노드 id (EQTONODEMAP) */
  node: number;
  /** 라벨 표시 좌표(mm, TEXT). 없으면 노드 좌표를 쓴다 */
  at: [number, number];
}

export interface Smat2022Layout {
  /** [minX, minY, maxX, maxY] (mm) */
  extent: [number, number, number, number];
  /** nodeId → [x, y] (mm) */
  nodes: Record<number, [number, number]>;
  links: Smat2022Link[];
  toolGroups: Smat2022ToolGroup[];
  stats: { nodes: number; links: number; curves: number; sections: number; toolGroups: number };
}

/** 원본 SMAT2022 `.rail` 텍스트를 구조화 레이아웃으로 파싱한다. */
export function parseSmat2022Rail(text: string): Smat2022Layout {
  const nodes: Record<number, [number, number]> = {};
  const links: Smat2022Link[] = [];
  const eqToNode: Record<string, number> = {};
  const textAt: Record<string, [number, number]> = {};
  let extent: [number, number, number, number] = [0, 0, 0, 0];
  const sections = new Set<number>();

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    if (!raw) continue;
    const f = raw.split('\t');
    switch (f[0]) {
      case 'SCALE': {
        // SCALE minX maxX minY maxY → extent [minX, minY, maxX, maxY]
        const [minX, maxX, minY, maxY] = [Number(f[1]), Number(f[2]), Number(f[3]), Number(f[4])];
        extent = [minX, minY, maxX, maxY];
        break;
      }
      case 'NODE': {
        nodes[Number(f[1])] = [Number(f[2]), Number(f[3])];
        break;
      }
      case 'RAILLIST': {
        const section = Number(f[1]);
        sections.add(section);
        links.push({
          section,
          curve: f[2] === 'CURVE',
          from: Number(f[3]),
          to: Number(f[4]),
          a: [Number(f[5]), Number(f[6])],
          b: [Number(f[7]), Number(f[8])],
          length: Number(f[10]),
        });
        break;
      }
      case 'EQTONODEMAP': {
        eqToNode[f[1]!] = Number(f[2]);
        break;
      }
      case 'TEXT': {
        // TEXT <label> EQ <x> <y>
        textAt[f[1]!] = [Number(f[3]), Number(f[4])];
        break;
      }
      default:
        break; // RAILDATA / LINK(RAILLIST로 대체) / 기타 무시
    }
  }

  const toolGroups: Smat2022ToolGroup[] = Object.entries(eqToNode).map(([name, node]) => ({
    name,
    node,
    at: textAt[name] ?? nodes[node] ?? [0, 0],
  }));

  return {
    extent,
    nodes,
    links,
    toolGroups,
    stats: {
      nodes: Object.keys(nodes).length,
      links: links.length,
      curves: links.filter((l) => l.curve).length,
      sections: sections.size,
      toolGroups: toolGroups.length,
    },
  };
}
