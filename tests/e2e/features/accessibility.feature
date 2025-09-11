@a11y @buttons
Feature: Accessibility and button visibility
  Ensure buttons are visible, accessible, and interactable across pages and viewports

  Background:
    Given the application is available

  Scenario Outline: Primary buttons are visible and enabled
    When I visit <path>
    Then all primary buttons should be visible and enabled

    Examples:
      | path              |
      | "/"               |
      | "/workspaces"     |
      | "/w/test"         |
      | "/auth/login"     |
      | "/auth/signup"    |

  Scenario: Buttons are accessible via keyboard
    When I visit "/"
    And I press the "Tab" key repeatedly
    Then focus should land on interactive elements in logical order


