import { getDBConnByName } from './connections';
import { updateQueryIfNeeded } from './queries';


export const GET_SCRIPT_REQUEST = 'GET_SCRIPT_REQUEST';
export const GET_SCRIPT_SUCCESS = 'GET_SCRIPT_SUCCESS';
export const GET_SCRIPT_FAILURE = 'GET_SCRIPT_FAILURE';


export function getSQLScriptIfNeeded(database, table, actionType, objectType) {
  return (dispatch, getState) => {
    const state = getState();
    if (shouldFetchScript(state, database, table, actionType)) {
      return dispatch(getSQLScript(database, table, actionType, objectType));
    } else if (isScriptAlreadyFetched(state, database, table, actionType)) {
      const script = getAlreadyFetchedScript(state, database, table, actionType);
      return dispatch(updateQueryIfNeeded(script));
    }
  };
}

function shouldFetchScript (state, database, table, actionType) {
  const scripts = state.sqlscripts;
  if (!scripts) return true;
  if (scripts.isFetching) return false;
  if (!scripts.scriptsByObject[database]) return true;
  if (!scripts.scriptsByObject[database][table]) return true;
  if (!scripts.scriptsByObject[database][table][actionType]) return true;
  return scripts.didInvalidate;
}

function isScriptAlreadyFetched (state, database, table, actionType) {
  const scripts = state.sqlscripts;
  if (!scripts.scriptsByObject[database]) return false;
  if (!scripts.scriptsByObject[database][table]) return false;
  if (scripts.scriptsByObject[database][table][actionType]) return true;
  return false;
}

function getAlreadyFetchedScript (state, database, table, actionType) {
  return state.sqlscripts.scriptsByObject[database][table][actionType];
}


function getSQLScript (database, table, actionType, objectType) {
  return async (dispatch) => {
    dispatch({ type: GET_SCRIPT_REQUEST, database, table, actionType, objectType });
    try {
      const dbConn = getDBConnByName(database);
      let script;
      if (actionType === 'CREATE') {
        [script] = objectType === 'Table'
          ? await dbConn.getTableCreateScript(table)
          : await dbConn.getViewCreateScript(table);
      } else if (actionType === 'SELECT') {
        script = await dbConn.getTableSelectScript(table);
      } else if (actionType === 'INSERT') {
        script = await dbConn.getTableInsertScript(table);
      } else if (actionType === 'UPDATE') {
        script = await dbConn.getTableUpdateScript(table);
      } else if (actionType === 'DELETE') {
        script = await dbConn.getTableDeleteScript(table);
      }
      dispatch({ type: GET_SCRIPT_SUCCESS, database, table, script, actionType, objectType });
      dispatch(updateQueryIfNeeded(script));
    } catch (error) {
      dispatch({ type: GET_SCRIPT_FAILURE, error });
    }
  };
}
