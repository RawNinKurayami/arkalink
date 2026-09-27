import type {Story} from './story-data';
import type {Node,Edge} from '@xyflow/react';
export type Mark={id:string;tool:'pen'|'circle'|'text';color:string;points:{x:number;y:number}[];text?:string};
export type Material={hex:string;name:string;part?:string;finish?:string;texture?:string;textureFilename?:string};
export type Data={story?:Story;kind:string;title:string;text?:string;referenceUrl?:string;portalBoardId?:string;url?:string;filename?:string;category?:string;status?:string;colors?:Material[];crop?:boolean;annotations?:Mark[];groupId?:string;collapsed?:boolean;fileSize?:number};
export type Modeling={scale?:number;height?:number;parts?:string;joints?:string;assembly?:string;notes?:string};
export type ViewSetup={front?:string;side?:string;back?:string;zoom?:number;y?:number;guides?:number[]};
export type Version={id:string;name:string;date:string;url:string};
export type Board={id:string;name:string;nodes:Node<Data>[];edges:Edge[];deletedAt?:string;coverId?:string;modeling?:Modeling;views?:ViewSetup;versions?:Version[];trash?:{id:string;date:string;name:string;nodes:Node<Data>[];edges:Edge[]}[]};
