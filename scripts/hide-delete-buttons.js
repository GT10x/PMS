const fs = require('fs');
const path = 'C:/Users/PCS/pms/app/dashboard/project/[id]/modules/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update the feature delete button to only show for master admin
const oldFeatureDelete = `{canManageModules() && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startEditFeature(module.id, idx, cleanLine); }}
                                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                        title="Edit"
                                      >
                                        <i className="fas fa-pen text-xs"></i>
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deleteFeature(module.id, idx); }}
                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        title="Delete"
                                      >
                                        <i className="fas fa-trash text-xs"></i>
                                      </button>
                                    </div>
                                  )}`;

const newFeatureDelete = `{canManageModules() && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startEditFeature(module.id, idx, cleanLine); }}
                                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                        title="Edit"
                                      >
                                        <i className="fas fa-pen text-xs"></i>
                                      </button>
                                      {isMasterAdmin() && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); deleteFeature(module.id, idx); }}
                                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                          title="Delete"
                                        >
                                          <i className="fas fa-trash text-xs"></i>
                                        </button>
                                      )}
                                    </div>
                                  )}`;

content = content.replace(oldFeatureDelete, newFeatureDelete);

// 2. Update the module delete button to only show for master admin
const oldModuleDelete = `{canManageModules() && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(module); }}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-cog mr-1"></i> Edit Details
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-trash mr-1"></i> Delete
                        </button>
                      </div>
                    )}`;

const newModuleDelete = `{canManageModules() && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(module); }}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        >
                          <i className="fas fa-cog mr-1"></i> Edit Details
                        </button>
                        {isMasterAdmin() && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <i className="fas fa-trash mr-1"></i> Delete
                          </button>
                        )}
                      </div>
                    )}`;

content = content.replace(oldModuleDelete, newModuleDelete);

fs.writeFileSync(path, content);
console.log('Updated UI to hide delete buttons for non-master admin');
