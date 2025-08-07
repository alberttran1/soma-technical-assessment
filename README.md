## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!


## Solution:

1. Due date funcitonality has been added
- due date defaults to current date
- due date is optional and a task can be created without one as a general task
- due date displayed in grey by default and red if current date is past due date

2. Image generation is hooked up to task creation
- if no results based on task name there is no image displayed
- otherwise first image returned in pexels api search is returned and displayed with tasks

3. Task dependencies added
- dependencies can be added by dragging a task within another task, the outside task depends on whats inside of it
- a task can haave multiple dependencies
- a task cannot be set to be dependant on one of its dependencies (no circular dependencies)
- critical path tasks are highlighted in red
- all tasks have an "earliest possible start date" which is based on the duration of dependencies, the duration of all tasks in a parent task's dependency list are summed up recursively to a "required time before task start" value and the "earliest possible start date" is today's date + "required time before task start"
- task dependencies are visualized by containment
