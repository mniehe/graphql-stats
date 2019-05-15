import { GraphQLObjectTypeConfig, GraphQLString, GraphQLNonNull, GraphQLID } from 'graphql';

const testObject: GraphQLObjectTypeConfig<any, any> = {
  description: 'Represents a user as it exists in the system.',
  fields: {
    createdAt: {
      resolve: (root: any) => root.createdAt,
      type: GraphQLString,
    },
    email: {
      resolve: (root: any) => root.email,
      type: new GraphQLNonNull(GraphQLString),
    },
    firstName: {
      type: GraphQLString,
    },
    fullName: {
      resolve: (root: any) => `${root.firstName} ${root.lastName}`,
      type: GraphQLString,
    },
    id: {
      resolve: (root: any) => root.id,
      type: new GraphQLNonNull(GraphQLID),
      analyze: true,
    },
    lastName: {
      type: GraphQLString,
    },
    phoneNumber: {
      type: GraphQLString,
    },
    updatedAt: {
      resolve: (root: any) => root.updatedAt,
      type: GraphQLString,
    },
  },
  name: 'User',
};

export interface StatsDataStore {
  write(objectName: string, fieldName: string, duration: number): Promise<void>;
}

export interface GraphQLStatsEngineOptions {
  dataStore: StatsDataStore;
}

type ResolveFunction = (root: any, context: any, req: any) => Promise<any>;

export interface AnalyzeOptions {
  objectName: string;
  fieldName: string;
  resolve: ResolveFunction;
}

const NS_PER_MS = BigInt(1e6);

export class GraphQLStatsEngine {
  private dataStore: StatsDataStore;

  constructor(options: GraphQLStatsEngineOptions) {
    this.dataStore = options.dataStore;
  }

  public analyzeObject(graphqlObject: GraphQLObjectTypeConfig<any, any>): GraphQLObjectTypeConfig<any, any> {
    const objectName = graphqlObject.name;
    
    Object.entries(graphqlObject.fields)
      .forEach(([fieldName, values]) => {
        if (values.analyze) {
          values.resolve = this.analyzeResolver({
            fieldName,
            objectName,
            resolve: values.resolve,
          });          
        }
      })
    return graphqlObject;
  }

  public analyzeResolver(options: AnalyzeOptions): ResolveFunction {
    const dataStore = this.dataStore;

    return async function analyzer(root: any, context: any, req: any): Promise<any> {
      const start = process.hrtime.bigint();
      const resolveResult = await options.resolve(root, context, req);
      const duration = Number((process.hrtime.bigint() - start) / NS_PER_MS); // in nanoseconds

      dataStore.write(options.objectName, options.fieldName, duration);

      return resolveResult;
    };
  }
}
